"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cloneLayer, createLayer } from "./factory";
import { TEMPLATES, buildTemplate } from "./templates";
import { sanitizeDoc } from "./sanitize";
import type { Layer, LayerType, WallpaperDoc } from "./types";

const STORAGE_KEY = "tapiz:doc:v1";

/** First design: 4K for computers; on phones and tablets, the device's own screen so it fits right away. */
export function initialDoc(): WallpaperDoc {
  let width = 3840;
  let height = 2160;
  if (typeof window !== "undefined" && !matchMedia("(min-width: 1024px)").matches) {
    const dpr = window.devicePixelRatio || 1;
    const even = (n: number) => Math.min(4096, Math.round((n * dpr) / 2) * 2);
    width = even(screen.width);
    height = even(screen.height);
  }
  return { width, height, ...buildTemplate(TEMPLATES[0]) };
}

interface History {
  past: WallpaperDoc[];
  present: WallpaperDoc;
  future: WallpaperDoc[];
}

export type Selection = string | "background";

export function useEditor() {
  const [hist, setHist] = useState<History>(() => ({ past: [], present: initialDoc(), future: [] }));
  const [selected, setSelected] = useState<Selection>("background");
  const lastKey = useRef<{ key: string; at: number } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  /** Applies a change. Consecutive changes with the same key (e.g. slider drags) collapse into one undo step. */
  const setDoc = useCallback((fn: (d: WallpaperDoc) => WallpaperDoc, key?: string) => {
    const now = Date.now();
    const coalesce = !!key && lastKey.current?.key === key && now - lastKey.current.at < 800;
    lastKey.current = key ? { key, at: now } : null;
    setHist((h) => {
      const next = fn(h.present);
      if (next === h.present) return h;
      return {
        past: coalesce ? h.past : [...h.past.slice(-80), h.present],
        present: next,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    lastKey.current = null;
    setHist((h) => (h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h));
  }, []);

  const redo = useCallback(() => {
    lastKey.current = null;
    setHist((h) => (h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h));
  }, []);

  const updateLayer = useCallback(
    <T extends Layer>(id: string, patch: Partial<T> | ((l: T) => T), key?: string) => {
      setDoc(
        (d) => ({
          ...d,
          layers: d.layers.map((l) => (l.id !== id ? l : typeof patch === "function" ? patch(l as T) : ({ ...l, ...patch } as Layer))),
        }),
        key ? `${id}:${key}` : undefined,
      );
    },
    [setDoc],
  );

  const addLayer = useCallback(
    (type: LayerType | Layer) => {
      const layer = typeof type === "string" ? createLayer(type) : type;
      setDoc((d) => ({ ...d, layers: [...d.layers, layer] }));
      setSelected(layer.id);
    },
    [setDoc],
  );

  const removeLayer = useCallback(
    (id: string) => {
      setDoc((d) => ({ ...d, layers: d.layers.filter((l) => l.id !== id) }));
      setSelected((s) => (s === id ? "background" : s));
    },
    [setDoc],
  );

  const duplicateLayer = useCallback(
    (id: string) => {
      let newId = "";
      setDoc((d) => {
        const i = d.layers.findIndex((l) => l.id === id);
        if (i < 0) return d;
        const copy = cloneLayer(d.layers[i]);
        newId = copy.id;
        const layers = [...d.layers];
        layers.splice(i + 1, 0, copy);
        return { ...d, layers };
      });
      queueMicrotask(() => newId && setSelected(newId));
    },
    [setDoc],
  );

  const moveLayer = useCallback(
    (id: string, to: number) => {
      setDoc((d) => {
        const from = d.layers.findIndex((l) => l.id === id);
        if (from < 0 || to < 0 || to >= d.layers.length || from === to) return d;
        const layers = [...d.layers];
        const [l] = layers.splice(from, 1);
        layers.splice(to, 0, l);
        return { ...d, layers };
      });
    },
    [setDoc],
  );

  const loadDesign = useCallback(
    (design: Partial<WallpaperDoc>) => {
      setDoc((d) => ({ ...d, ...design }));
      setSelected("background");
    },
    [setDoc],
  );

  // Hydrate from share link or local storage.
  useEffect(() => {
    (async () => {
      try {
        const fromHash = await readShareHash();
        const raw = fromHash ?? sanitizeDoc(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"));
        if (raw) {
          setHist({ past: [], present: raw, future: [] });
          if (fromHash) history.replaceState(null, "", location.pathname);
        }
      } catch {
        /* ignore corrupt state */
      }
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(hist.present));
      } catch {
        /* storage full or blocked */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [hist.present, hydrated]);

  return {
    doc: hist.present,
    selected,
    select: setSelected,
    setDoc,
    updateLayer,
    addLayer,
    removeLayer,
    duplicateLayer,
    moveLayer,
    loadDesign,
    undo,
    redo,
    canUndo: hist.past.length > 0,
    canRedo: hist.future.length > 0,
  };
}

export type Editor = ReturnType<typeof useEditor>;

/* ---------- Share links (deflate + base64url in the hash) ---------- */

async function streamToBytes(stream: ReadableStream<Uint8Array>, limit = Infinity) {
  const reader = stream.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    // A few KB of link can inflate into gigabytes; stop early.
    if (total > limit) {
      await reader.cancel();
      throw new Error("Diseño demasiado grande");
    }
    parts.push(value);
  }
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export async function makeShareUrl(doc: WallpaperDoc, path = location.pathname) {
  const bytes = new TextEncoder().encode(JSON.stringify(doc));
  const packed = await streamToBytes(new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw")));
  let bin = "";
  packed.forEach((b) => (bin += String.fromCharCode(b)));
  const b64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${location.origin}${path}#d=${b64}`;
}

export async function readShareHash(): Promise<WallpaperDoc | null> {
  const m = location.hash.match(/^#d=([A-Za-z0-9_-]{1,400000})$/);
  if (!m) return null;
  const b64 = m[1].replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const out = await streamToBytes(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw")), 2_000_000);
  return sanitizeDoc(JSON.parse(new TextDecoder().decode(out)));
}

/* ---------- Saved designs ---------- */

const SAVED_KEY = "tapiz:saved:v1";

export interface SavedDesign {
  id: string;
  name: string;
  savedAt: number;
  thumb: string;
  doc: WallpaperDoc;
}

export function listSaved(): SavedDesign[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((d) => {
      const doc = sanitizeDoc(d?.doc);
      const thumb = typeof d?.thumb === "string" && d.thumb.startsWith("data:image/") ? d.thumb : "";
      return doc ? [{ id: String(d.id), name: String(d.name ?? "Diseño").slice(0, 60), savedAt: Number(d.savedAt) || 0, thumb, doc }] : [];
    });
  } catch {
    return [];
  }
}

export function writeSaved(list: SavedDesign[]) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

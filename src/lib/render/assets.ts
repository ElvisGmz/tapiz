import type { EmojiStyle, WallpaperDoc } from "../types";
import { FONTS } from "../fonts";
import { loadPhoto, photoLoaded } from "../photos";

/* ---------- Icons (lucide) ---------- */

type IconNode = [string, Record<string, string | number>][];
let iconData: Record<string, IconNode> | null = null;
let iconPromise: Promise<Record<string, IconNode>> | null = null;

export function loadIcons() {
  if (iconData) return Promise.resolve(iconData);
  iconPromise ??= import("lucide").then((m) => {
    iconData = m.icons as unknown as Record<string, IconNode>;
    return iconData;
  });
  return iconPromise;
}

export const getIconNode = (name: string) => iconData?.[name];
export const getIconNames = () => (iconData ? Object.keys(iconData) : []);

const pathCache = new Map<string, Path2D>();

/** Converts a lucide icon (24×24 grid) into a single Path2D for crisp canvas drawing at any size. */
export function getIconPath(name: string): Path2D | null {
  const cached = pathCache.get(name);
  if (cached) return cached;
  const node = iconData?.[name];
  if (!node) return null;
  const path = new Path2D();
  const n = (v: unknown) => Number(v ?? 0);
  for (const [tag, a] of node) {
    switch (tag) {
      case "path":
        path.addPath(new Path2D(String(a.d)));
        break;
      case "circle":
        path.moveTo(n(a.cx) + n(a.r), n(a.cy));
        path.arc(n(a.cx), n(a.cy), n(a.r), 0, Math.PI * 2);
        break;
      case "ellipse":
        path.moveTo(n(a.cx) + n(a.rx), n(a.cy));
        path.ellipse(n(a.cx), n(a.cy), n(a.rx), n(a.ry), 0, 0, Math.PI * 2);
        break;
      case "rect": {
        const r = n(a.rx ?? a.ry);
        path.roundRect(n(a.x), n(a.y), n(a.width), n(a.height), r);
        break;
      }
      case "line":
        path.moveTo(n(a.x1), n(a.y1));
        path.lineTo(n(a.x2), n(a.y2));
        break;
      case "polyline":
      case "polygon": {
        const pts = String(a.points).trim().split(/[\s,]+/).map(Number);
        path.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) path.lineTo(pts[i], pts[i + 1]);
        if (tag === "polygon") path.closePath();
        break;
      }
    }
  }
  pathCache.set(name, path);
  return path;
}

/* ---------- Emoji (vector SVG from CDN, falls back to the system font) ---------- */

function codepoints(emoji: string, keepFe0f: boolean) {
  const cps = [...emoji].map((c) => c.codePointAt(0)!.toString(16));
  return keepFe0f ? cps : cps.filter((c) => c !== "fe0f");
}

function emojiUrl(emoji: string, style: EmojiStyle) {
  const hasZwj = emoji.includes("‍");
  if (style === "twemoji") {
    return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${codepoints(emoji, hasZwj).join("-")}.svg`;
  }
  return `https://cdn.jsdelivr.net/npm/openmoji@15.1.0/color/svg/${codepoints(emoji, hasZwj).join("-").toUpperCase()}.svg`;
}

const emojiImages = new Map<string, HTMLImageElement | null>();
const emojiPending = new Map<string, Promise<void>>();

export function getEmojiImage(emoji: string, style: EmojiStyle) {
  if (style === "system") return null;
  return emojiImages.get(`${style}:${emoji}`) ?? null;
}

async function loadEmoji(emoji: string, style: EmojiStyle) {
  const key = `${style}:${emoji}`;
  if (emojiImages.has(key)) return;
  if (!emojiPending.has(key)) {
    emojiPending.set(
      key,
      (async () => {
        try {
          const res = await fetch(emojiUrl(emoji, style));
          if (!res.ok) throw new Error(String(res.status));
          let svg = await res.text();
          // Give the SVG an explicit size so every browser rasterizes it (Firefox needs it).
          svg = svg.replace(/<svg([^>]*)>/, (m, attrs: string) =>
            /\swidth=/.test(attrs) ? m : `<svg${attrs} width="512" height="512">`,
          );
          const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
          const img = new Image();
          img.decoding = "async";
          img.src = url;
          await img.decode();
          emojiImages.set(key, img);
        } catch {
          emojiImages.set(key, null);
        }
      })(),
    );
  }
  await emojiPending.get(key);
}

/* ---------- Preload everything a doc needs ---------- */

export async function preloadAssets(doc: WallpaperDoc) {
  const jobs: Promise<unknown>[] = [];
  for (const layer of doc.layers) {
    if (!layer.visible) continue;
    if (layer.type === "icon") jobs.push(loadIcons());
    if (layer.type === "image") for (const id of layer.images) jobs.push(loadPhoto(id));
    if (layer.type === "emoji" && layer.style !== "system") {
      for (const c of layer.chars) jobs.push(loadEmoji(c, layer.style));
    }
    if (layer.type === "text" && typeof document !== "undefined") {
      const f = FONTS[layer.font];
      jobs.push(document.fonts.load(`${layer.weight} 64px ${f.family}`).catch(() => null));
    }
  }
  await Promise.all(jobs);
}

/** True when a doc can be drawn right now without waiting for network/fonts. */
export function assetsReady(doc: WallpaperDoc) {
  for (const layer of doc.layers) {
    if (!layer.visible) continue;
    if (layer.type === "icon" && !iconData) return false;
    if (layer.type === "image" && layer.images.some((id) => !photoLoaded(id))) return false;
    if (layer.type === "emoji" && layer.style !== "system") {
      if (layer.chars.some((c) => !emojiImages.has(`${layer.style}:${c}`))) return false;
    }
  }
  return true;
}

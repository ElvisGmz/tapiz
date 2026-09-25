"use client";

import { uid } from "./random";

/** User photos live in IndexedDB (they're far too big for localStorage); layers reference them by id. */

export interface PhotoMeta {
  id: string;
  name: string;
  width: number;
  height: number;
  createdAt: number;
  thumb: string; // small data URL for pickers
  hasAlpha?: boolean; // transparent PNG/WebP (stickers, cutouts)
}

interface PhotoRecord extends PhotoMeta {
  blob: Blob;
}

const DB = "tapiz";
const STORE = "photos";
let dbPromise: Promise<IDBDatabase> | null = null;

function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const req = fn(d.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const MAX_SIDE = 8192;

/** Stores an image blob (downscaling anything absurdly large) and returns its metadata. */
function detectAlpha(bitmap: ImageBitmap) {
  const s = 64 / Math.max(bitmap.width, bitmap.height);
  const c = new OffscreenCanvas(Math.max(1, Math.round(bitmap.width * s)), Math.max(1, Math.round(bitmap.height * s)));
  const x = c.getContext("2d")!;
  x.drawImage(bitmap, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  let transparent = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 250) transparent++;
  return transparent / (d.length / 4) > 0.01;
}

export async function addPhoto(blob: Blob, name = "Foto"): Promise<PhotoMeta> {
  let bitmap = await createImageBitmap(blob);
  const hasAlpha = detectAlpha(bitmap);
  if (Math.max(bitmap.width, bitmap.height) > MAX_SIDE) {
    const s = MAX_SIDE / Math.max(bitmap.width, bitmap.height);
    const c = new OffscreenCanvas(Math.round(bitmap.width * s), Math.round(bitmap.height * s));
    c.getContext("2d")!.drawImage(bitmap, 0, 0, c.width, c.height);
    blob = await c.convertToBlob(hasAlpha ? { type: "image/png" } : { type: "image/jpeg", quality: 0.92 });
    bitmap.close();
    bitmap = await createImageBitmap(blob);
  }
  const ts = 160 / Math.max(bitmap.width, bitmap.height);
  const tc = new OffscreenCanvas(Math.max(1, Math.round(bitmap.width * ts)), Math.max(1, Math.round(bitmap.height * ts)));
  tc.getContext("2d")!.drawImage(bitmap, 0, 0, tc.width, tc.height);
  const thumbBlob = await tc.convertToBlob(hasAlpha ? { type: "image/png" } : { type: "image/jpeg", quality: 0.8 });
  const thumb = await new Promise<string>((res) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.readAsDataURL(thumbBlob);
  });
  const rec: PhotoRecord = { id: uid(), name, width: bitmap.width, height: bitmap.height, createdAt: Date.now(), thumb, hasAlpha, blob };
  bitmaps.set(rec.id, bitmap);
  await tx("readwrite", (s) => s.put(rec));
  return strip(rec);
}

function strip(rec: PhotoRecord): PhotoMeta {
  const { id, name, width, height, createdAt, thumb, hasAlpha } = rec;
  return { id, name, width, height, createdAt, thumb, hasAlpha };
}

export async function listPhotos(): Promise<PhotoMeta[]> {
  const all = await tx<PhotoRecord[]>("readonly", (s) => s.getAll());
  return all.map(strip).sort((a, b) => b.createdAt - a.createdAt);
}

export async function deletePhoto(id: string) {
  bitmaps.get(id)?.close();
  bitmaps.delete(id);
  await tx("readwrite", (s) => s.delete(id));
}

/* ---------- Decoded bitmaps for the renderer ---------- */

const bitmaps = new Map<string, ImageBitmap | null>();
const pending = new Map<string, Promise<void>>();

export const getPhotoBitmap = (id: string) => bitmaps.get(id) ?? null;
export const photoLoaded = (id: string) => bitmaps.has(id);

export function loadPhoto(id: string) {
  if (bitmaps.has(id)) return Promise.resolve();
  if (!pending.has(id)) {
    pending.set(
      id,
      tx<PhotoRecord | undefined>("readonly", (s) => s.get(id))
        .then(async (rec) => bitmaps.set(id, rec ? await createImageBitmap(rec.blob) : null))
        .catch(() => bitmaps.set(id, null))
        .then(() => undefined),
    );
  }
  return pending.get(id)!;
}

/* ---------- Getting images in: files, clipboard, links ---------- */

export async function photoFromUrl(raw: string): Promise<PhotoMeta> {
  const url = raw.trim();
  let blob: Blob;
  if (url.startsWith("data:image/")) {
    blob = await (await fetch(url)).blob();
  } else {
    const res = await fetch(`/api/image?url=${encodeURIComponent(url)}`);
    if (!res.ok) {
      const msg = await res.json().catch(() => null);
      throw new Error(msg?.error ?? "No se pudo traer la imagen");
    }
    blob = await res.blob();
  }
  const name = decodeURIComponent(url.startsWith("data:") ? "Imagen pegada" : (url.split("/").pop()?.split("?")[0] ?? "Imagen")).slice(0, 40);
  return addPhoto(blob, name);
}

export const looksLikeImageUrl = (s: string) => /^data:image\//.test(s.trim()) || /^https?:\/\/\S+$/i.test(s.trim());

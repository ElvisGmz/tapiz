import { preloadAssets } from "./render/assets";
import { renderWallpaper } from "./render";
import type { WallpaperDoc } from "./types";

export type ExportFormat = "png" | "jpeg" | "webp";

export async function renderToBlob(doc: WallpaperDoc, width: number, height: number, format: ExportFormat = "png", quality = 0.95) {
  await preloadAssets(doc);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear el lienzo (¿resolución demasiado grande para este navegador?)");
  renderWallpaper(ctx, doc, width, height);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, `image/${format}`, quality));
  canvas.width = canvas.height = 0; // free GPU memory right away
  if (!blob) throw new Error("El navegador no pudo generar la imagen. Prueba una resolución menor.");
  return blob;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function renderThumb(doc: WallpaperDoc, maxSide = 320) {
  const scale = maxSide / Math.max(doc.width, doc.height);
  const blob = await renderToBlob(doc, Math.round(doc.width * scale), Math.round(doc.height * scale), "jpeg", 0.8);
  return new Promise<string>((res) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.readAsDataURL(blob);
  });
}

/* ---------- Shared helpers for long exports ---------- */

/** Lets the browser paint (progress bars, cancel clicks) between heavy frames. */
const yieldToBrowser = () => new Promise<void>((r) => setTimeout(r, 0));

const abortIf = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new DOMException("Cancelado", "AbortError");
};

const isSafari = () => typeof navigator !== "undefined" && /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);

/** Safari refuses canvases above ~16.7 MP; fail early with a clear message instead of a cryptic encoder error. */
function createExportCanvas(width: number, height: number) {
  if (isSafari() && width * height > 16_777_216) {
    throw new Error(`Safari no permite lienzos de ${width}×${height} (máx. ~16.7 MP). Baja a 5K o menos, o usa Chrome.`);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx || canvas.width !== width) throw new Error("No se pudo crear un lienzo tan grande. Prueba una resolución menor.");
  return { canvas, ctx };
}

export interface ExportProgress {
  progress?: (fraction: number | null, message?: string) => void;
  signal?: AbortSignal;
}

/* ---------- macOS dynamic wallpaper ---------- */

export async function renderDynamicHeic(doc: WallpaperDoc, { progress, signal }: ExportProgress = {}) {
  const { appearanceIndexes, syncScenes } = await import("./scenes");
  const { buildXmp, canEncodeHeic, encodeHevcImage, muxHeic } = await import("./heic");
  const scenes = syncScenes(doc);
  if (scenes.length < 2) throw new Error("Necesitas al menos 2 escenas");
  // 4:2:0 video needs even dimensions.
  const width = doc.width + (doc.width % 2);
  const height = doc.height + (doc.height % 2);
  if (!(await canEncodeHeic(width, height))) {
    throw new Error(`Tu equipo no puede codificar HEVC a ${width}×${height}. Prueba 4K o 5K, o usa Chrome/Safari en una Mac reciente.`);
  }
  const { canvas, ctx } = createExportCanvas(width, height);

  const images = [];
  try {
    for (const [i, s] of scenes.entries()) {
      abortIf(signal);
      progress?.(i / (scenes.length + 1), `Codificando ${s.name} (${i + 1}/${scenes.length})…`);
      await yieldToBrowser();
      const sceneDoc = { width, height, background: s.background, layers: s.layers };
      await preloadAssets(sceneDoc);
      renderWallpaper(ctx, sceneDoc, width, height);
      images.push(await encodeHevcImage(canvas, width, height));
    }
  } finally {
    canvas.width = canvas.height = 0;
  }

  const { light, dark } = appearanceIndexes(scenes);
  const xmp =
    doc.dynamicMode === "time"
      ? buildXmp({ kind: "time", light, dark, times: scenes.map((s, index) => ({ index, hour: s.hour })) })
      : buildXmp({ kind: "appearance", light, dark });
  progress?.(scenes.length / (scenes.length + 1), "Empaquetando .heic…");
  const bytes = muxHeic(images, xmp);
  return new Blob([bytes as BlobPart], { type: "image/heic" });
}

/* ---------- Animated loop video ---------- */

export type VideoCodecChoice = "hevc" | "avc";

/**
 * Bits per second for a wallpaper loop. Generous enough for gradients and grain, but far below
 * "very high" presets that made 4K60 files ~280 Mbps and exhausted memory.
 */
export function videoBitrate(width: number, height: number, fps: number, codec: VideoCodecChoice) {
  const bitsPerPixel = codec === "hevc" ? 0.1 : 0.15;
  return Math.round(Math.min(160e6, Math.max(4e6, width * height * fps * bitsPerPixel)));
}

export function estimateVideoMB(width: number, height: number, fps: number, codec: VideoCodecChoice, seconds: number) {
  return (videoBitrate(width, height, fps, codec) * seconds) / 8 / 1e6;
}

/** Chrome/Edge can stream the file straight to disk, so long 4K/8K videos don't have to fit in memory. */
export const canStreamToDisk = () =>
  typeof window !== "undefined" && typeof (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker === "function";

export async function pickVideoFile(filename: string) {
  const picker = (window as unknown as { showSaveFilePicker: (o: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker;
  return picker({ suggestedName: filename, types: [{ description: "Video MP4", accept: { "video/mp4": [".mp4"] } }] });
}

export async function renderLoopVideo(
  doc: WallpaperDoc,
  opts: { width: number; height: number; fps: number; codec: VideoCodecChoice; loops?: number; file?: FileSystemFileHandle },
  { progress, signal }: ExportProgress = {},
) {
  const { BufferTarget, CanvasSource, Mp4OutputFormat, Output, StreamTarget, canEncodeVideo } = await import("mediabunny");
  const { loopOf } = await import("./render");
  const width = opts.width + (opts.width % 2);
  const height = opts.height + (opts.height % 2);
  const bitrate = videoBitrate(width, height, opts.fps, opts.codec);
  if (!(await canEncodeVideo(opts.codec, { width, height, bitrate }))) {
    throw new Error(
      `Este navegador no puede codificar ${opts.codec === "hevc" ? "HEVC" : "H.264"} a ${width}×${height}. ${
        opts.codec === "avc" ? "H.264 llega hasta ~4K: usa HEVC o baja la resolución." : "Prueba 4K o menos."
      }`,
    );
  }
  progress?.(0, "Preparando…");
  await preloadAssets(doc);
  const { canvas, ctx } = createExportCanvas(width, height);

  const writable = opts.file ? await opts.file.createWritable() : null;
  const target = writable ? new StreamTarget(writable as unknown as WritableStream, { chunked: true }) : new BufferTarget();
  // In memory we can move the index to the front (plays faster); streaming writes it at the end.
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: writable ? false : "in-memory" }), target });
  const source = new CanvasSource(canvas, { codec: opts.codec, bitrate, keyFrameInterval: 2 });
  output.addVideoTrack(source, { frameRate: opts.fps });
  await output.start();

  const loop = loopOf(doc);
  const total = Math.round(loop * (opts.loops ?? 1) * opts.fps);
  const dt = 1 / opts.fps;
  try {
    for (let i = 0; i < total; i++) {
      abortIf(signal);
      renderWallpaper(ctx, doc, width, height, i * dt);
      await source.add(i * dt, dt);
      progress?.((i + 1) / total, i === 0 ? "Renderizando cuadros…" : undefined);
      await yieldToBrowser();
    }
    progress?.(1, "Finalizando archivo…");
    await output.finalize();
  } catch (e) {
    await output.cancel().catch(() => {});
    if (writable) await (writable as unknown as { abort?: () => Promise<void> }).abort?.().catch(() => {});
    throw e;
  } finally {
    canvas.width = canvas.height = 0;
  }
  if (writable) return null; // already on disk
  return new Blob([(target as InstanceType<typeof BufferTarget>).buffer!], { type: "video/mp4" });
}

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

/* ---------- macOS dynamic wallpaper ---------- */

export async function renderDynamicHeic(doc: WallpaperDoc, onProgress?: (msg: string) => void) {
  const { appearanceIndexes, syncScenes } = await import("./scenes");
  const { buildXmp, encodeHevcImage, muxHeic } = await import("./heic");
  const scenes = syncScenes(doc);
  if (scenes.length < 2) throw new Error("Necesitas al menos 2 escenas");
  // 4:2:0 video needs even dimensions.
  const width = doc.width + (doc.width % 2);
  const height = doc.height + (doc.height % 2);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear el lienzo");

  const images = [];
  for (const [i, s] of scenes.entries()) {
    onProgress?.(`Codificando ${s.name} (${i + 1}/${scenes.length})…`);
    const sceneDoc = { width, height, background: s.background, layers: s.layers };
    await preloadAssets(sceneDoc);
    renderWallpaper(ctx, sceneDoc, width, height);
    images.push(await encodeHevcImage(canvas, width, height));
  }
  canvas.width = canvas.height = 0;

  const { light, dark } = appearanceIndexes(scenes);
  const xmp =
    doc.dynamicMode === "time"
      ? buildXmp({ kind: "time", light, dark, times: scenes.map((s, index) => ({ index, hour: s.hour })) })
      : buildXmp({ kind: "appearance", light, dark });
  onProgress?.("Empaquetando .heic…");
  const bytes = muxHeic(images, xmp);
  return new Blob([bytes as BlobPart], { type: "image/heic" });
}

/* ---------- Animated loop video ---------- */

export type VideoCodecChoice = "hevc" | "avc";

export async function renderLoopVideo(
  doc: WallpaperDoc,
  opts: { width: number; height: number; fps: number; codec: VideoCodecChoice; loops?: number },
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
) {
  const { BufferTarget, CanvasSource, Mp4OutputFormat, Output, QUALITY_VERY_HIGH, canEncodeVideo } = await import("mediabunny");
  const { loopOf } = await import("./render");
  const width = opts.width + (opts.width % 2);
  const height = opts.height + (opts.height % 2);
  if (!(await canEncodeVideo(opts.codec, { width, height }))) {
    throw new Error(`Este navegador no puede codificar ${opts.codec === "hevc" ? "HEVC" : "H.264"} a ${width}×${height}. Prueba otra resolución o códec.`);
  }
  await preloadAssets(doc);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
  const source = new CanvasSource(canvas, { codec: opts.codec, bitrate: QUALITY_VERY_HIGH, keyFrameInterval: 2 });
  output.addVideoTrack(source, { frameRate: opts.fps });
  await output.start();

  const loop = loopOf(doc);
  const total = Math.round(loop * (opts.loops ?? 1) * opts.fps);
  const dt = 1 / opts.fps;
  try {
    for (let i = 0; i < total; i++) {
      if (signal?.aborted) throw new DOMException("Cancelado", "AbortError");
      renderWallpaper(ctx, doc, width, height, i * dt);
      await source.add(i * dt, dt);
      onProgress?.((i + 1) / total);
    }
    await output.finalize();
  } catch (e) {
    await output.cancel().catch(() => {});
    throw e;
  } finally {
    canvas.width = canvas.height = 0;
  }
  return new Blob([(output.target as InstanceType<typeof BufferTarget>).buffer!], { type: "video/mp4" });
}

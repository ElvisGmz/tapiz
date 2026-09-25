import { FONTS } from "../fonts";
import { getPhotoBitmap } from "../photos";
import { mulberry32 } from "../random";
import type { EmojiLayer, IconLayer, ImageLayer, Layer, ShapeLayer, TextLayer, WallpaperDoc } from "../types";
import { getEmojiImage, getIconPath } from "./assets";
import { type AnyCanvas, type AnyCtx, createCanvas, ctx2d } from "./canvas";
import { makeFillStyle, paintFill } from "./fill";
import { type AnimatedItem, animateItems, animatedBackground } from "./motion";
import { drawPattern } from "./patterns";
import { layout } from "./placement";
import { shapePath } from "./shapes";
import { drawTexture } from "./textures";

const scratch = new Map<string, AnyCanvas>();
function scratchCanvas(W: number, H: number) {
  const key = `${W}x${H}`;
  let c = scratch.get(key);
  if (!c) {
    if (scratch.size >= 2) scratch.delete(scratch.keys().next().value!);
    c = createCanvas(W, H);
    scratch.set(key, c);
  }
  return c;
}

const supportsFilter = (() => {
  if (typeof document === "undefined") return false;
  const c = document.createElement("canvas").getContext("2d");
  return !!c && "filter" in c;
})();

export interface Frame {
  p: number; // loop phase 0..1
  t: number; // seconds since loop start
  loop: number; // loop length in seconds
}

export const loopOf = (doc: Pick<WallpaperDoc, "loop">) => doc.loop ?? 8;
export const frameAt = (doc: Pick<WallpaperDoc, "loop">, time: number): Frame => {
  const loop = loopOf(doc);
  const t = ((time % loop) + loop) % loop;
  return { p: t / loop, t, loop };
};

/** Renders the full wallpaper. All sizes in the doc are relative, so any W×H works. `time` is in seconds. */
export function renderWallpaper(ctx: AnyCtx, doc: WallpaperDoc, W: number, H: number, time = 0) {
  const min = Math.min(W, H);
  const f = frameAt(doc, time);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, W, H);
  paintFill(ctx, animatedBackground(doc.background, doc.backgroundAnim, f.p), 0, 0, W, H);

  const layerCanvas = scratchCanvas(W, H);
  const lctx = ctx2d(layerCanvas);

  for (const layer of doc.layers) {
    if (!layer.visible || layer.opacity <= 0) continue;
    lctx.save();
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.clearRect(0, 0, W, H);
    drawLayer(lctx, layer, W, H, f);
    lctx.restore();

    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = layer.blend;
    if (supportsFilter && layer.blur > 0) ctx.filter = `blur(${(layer.blur / 100) * min}px)`;
    if (layer.shadow.enabled) {
      ctx.shadowColor = layer.shadow.color;
      ctx.shadowBlur = (layer.shadow.blur / 100) * min;
      ctx.shadowOffsetX = (layer.shadow.x / 100) * min;
      ctx.shadowOffsetY = (layer.shadow.y / 100) * min;
    }
    ctx.drawImage(layerCanvas, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

function drawLayer(ctx: AnyCtx, layer: Layer, W: number, H: number, f: Frame) {
  switch (layer.type) {
    case "shape":
      return drawShapes(ctx, layer, W, H, f);
    case "emoji":
      return drawEmojis(ctx, layer, W, H, f);
    case "icon":
      return drawIcons(ctx, layer, W, H, f);
    case "image":
      return drawImages(ctx, layer, W, H, f);
    case "pattern":
      return drawPattern(ctx, layer, W, H, f);
    case "texture":
      return drawTexture(ctx, layer, W, H, f);
    case "text":
      return drawText(ctx, layer, W, H, f);
  }
}

function items(layer: { placement: ShapeLayer["placement"]; anim?: Layer["anim"] }, W: number, H: number, f: Frame) {
  return animateItems(layout(layer.placement, W, H), layer.anim, f.p);
}

/** Positions the context for one item; returns false if the item is invisible. */
function enter(ctx: AnyCtx, it: AnimatedItem) {
  if (it.alpha <= 0.01 || it.scale <= 0) return false;
  ctx.save();
  ctx.translate(it.x, it.y);
  ctx.rotate(it.rotation);
  if (it.scale !== 1) ctx.scale(it.scale, it.scale);
  if (it.alpha < 1) ctx.globalAlpha *= it.alpha;
  return true;
}

function drawShapes(ctx: AnyCtx, layer: ShapeLayer, W: number, H: number, f: Frame) {
  const list = items(layer, W, H, f);
  // Blob outlines are random per item but must stay stable while animating: seed per item index.
  for (const it of list) {
    const rng = mulberry32(layer.placement.seed + 7 + it.index * 131);
    const { path, w, h, evenOdd } = shapePath(layer, it.size, rng);
    if (!enter(ctx, it)) continue;
    ctx.fillStyle =
      layer.colorMode === "palette" && layer.palette.length
        ? layer.palette[Math.floor(it.rand * layer.palette.length)]
        : makeFillStyle(ctx, layer.fill, -w / 2, -h / 2, w, h);
    ctx.fill(path, evenOdd ? "evenodd" : "nonzero");
    if (layer.stroke.enabled && layer.stroke.width > 0) {
      ctx.strokeStyle = layer.stroke.color;
      ctx.lineWidth = (layer.stroke.width / 100) * it.size;
      ctx.lineJoin = "round";
      ctx.stroke(path);
    }
    ctx.restore();
  }
}

const SYSTEM_EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

function drawEmojis(ctx: AnyCtx, layer: EmojiLayer, W: number, H: number, f: Frame) {
  if (!layer.chars.length) return;
  const random = layer.placement.mode === "scatter";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const it of items(layer, W, H, f)) {
    const ch = layer.chars[random ? Math.floor(it.rand * layer.chars.length) : it.index % layer.chars.length];
    const img = getEmojiImage(ch, layer.style);
    if (!enter(ctx, it)) continue;
    if (img) {
      ctx.drawImage(img, -it.size / 2, -it.size / 2, it.size, it.size);
    } else {
      ctx.font = `${it.size * 0.84}px ${SYSTEM_EMOJI_FONT}`;
      ctx.fillText(ch, 0, it.size * 0.06);
    }
    ctx.restore();
  }
}

function drawIcons(ctx: AnyCtx, layer: IconLayer, W: number, H: number, f: Frame) {
  if (!layer.icons.length) return;
  const random = layer.placement.mode === "scatter";
  const colors = layer.colors.length ? layer.colors : ["#ffffff"];
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const it of items(layer, W, H, f)) {
    const n = layer.icons.length;
    const name = layer.icons[random ? Math.floor(it.rand * n) : it.index % n];
    const path = getIconPath(name);
    if (!path || !enter(ctx, it)) continue;
    const color = colors[random ? Math.floor(((it.rand * 997) % 1) * colors.length) : it.index % colors.length];
    const s = it.size / 24;
    ctx.scale(s, s);
    ctx.translate(-12, -12);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = layer.strokeWidth;
    if (layer.filled) ctx.fill(path);
    ctx.stroke(path);
    ctx.restore();
  }
}

function photoFilter(l: ImageLayer) {
  const parts: string[] = [];
  if (l.brightness !== 1) parts.push(`brightness(${l.brightness})`);
  if (l.contrast !== 1) parts.push(`contrast(${l.contrast})`);
  if (l.saturation !== 1) parts.push(`saturate(${l.saturation})`);
  if (l.grayscale > 0) parts.push(`grayscale(${l.grayscale})`);
  if (l.hue) parts.push(`hue-rotate(${l.hue}deg)`);
  return parts.join(" ") || "none";
}

/** Draws `img` covering the box (x, y, w, h), cropping around the focus point. */
function drawCover(ctx: AnyCtx, img: ImageBitmap, x: number, y: number, w: number, h: number, zoom = 1, fx = 0.5, fy = 0.5) {
  const s = Math.max(w / img.width, h / img.height) * zoom;
  const dw = img.width * s;
  const dh = img.height * s;
  ctx.drawImage(img, x + (w - dw) * fx, y + (h - dh) * fy, dw, dh);
}

function framePath(frame: ImageLayer["frame"], w: number, h: number, rng: () => number) {
  const p = new Path2D();
  switch (frame) {
    case "circle":
      p.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
      break;
    case "rounded":
      p.roundRect(-w / 2, -h / 2, w, h, Math.min(w, h) * 0.12);
      break;
    case "arch":
      p.moveTo(-w / 2, h / 2);
      p.lineTo(-w / 2, -h / 2 + w / 2);
      p.arc(0, -h / 2 + w / 2, w / 2, Math.PI, 0);
      p.lineTo(w / 2, h / 2);
      p.closePath();
      break;
    case "blob": {
      const n = 7;
      const pts: [number, number][] = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = 0.8 + rng() * 0.2;
        pts.push([Math.cos(a) * (w / 2) * r, Math.sin(a) * (h / 2) * r]);
      }
      p.moveTo(pts[0][0], pts[0][1]);
      for (let i = 0; i < n; i++) {
        const [p0, p1, p2, p3] = [pts[(i - 1 + n) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]];
        p.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
      }
      p.closePath();
      break;
    }
    default:
      p.rect(-w / 2, -h / 2, w, h);
  }
  return p;
}

function drawImages(ctx: AnyCtx, layer: ImageLayer, W: number, H: number, f: Frame) {
  const bitmaps = layer.images.map(getPhotoBitmap).filter((b): b is ImageBitmap => !!b);
  if (!bitmaps.length) return;
  const filter = photoFilter(layer);

  if (layer.mode === "fill") {
    const img = bitmaps[0];
    ctx.save();
    if (supportsFilter) ctx.filter = filter;
    if (layer.fit === "contain") {
      const s = Math.min(W / img.width, H / img.height) * layer.zoom;
      const dw = img.width * s;
      const dh = img.height * s;
      ctx.drawImage(img, (W - dw) * layer.focusX, (H - dh) * layer.focusY, dw, dh);
    } else {
      drawCover(ctx, img, 0, 0, W, H, layer.zoom, layer.focusX, layer.focusY);
    }
    ctx.restore();
    return;
  }

  const random = layer.placement.mode === "scatter";
  for (const it of items(layer, W, H, f)) {
    const img = bitmaps[random ? Math.floor(it.rand * bitmaps.length) : it.index % bitmaps.length];
    const square = layer.frame === "circle" || layer.frame === "polaroid" || layer.frame === "blob";
    const aspect = layer.frame === "arch" ? 0.78 : square ? 1 : img.width / img.height;
    const w = aspect >= 1 ? it.size : it.size * aspect;
    const h = aspect >= 1 ? it.size / aspect : it.size;
    if (!enter(ctx, it)) continue;
    if (layer.frame === "polaroid") {
      const pad = w * 0.06;
      ctx.fillStyle = layer.frameColor;
      ctx.fillRect(-w / 2 - pad, -h / 2 - pad, w + pad * 2, h + pad * 4.2);
      ctx.translate(0, -pad * 1.1);
    }
    const clip = framePath(layer.frame === "polaroid" ? "none" : layer.frame, w, h, mulberry32(layer.placement.seed + it.index));
    ctx.clip(clip);
    if (supportsFilter) ctx.filter = filter;
    drawCover(ctx, img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
}

function drawText(ctx: AnyCtx, layer: TextLayer, W: number, H: number, f: Frame) {
  const min = Math.min(W, H);
  const px = layer.size * min;
  const font = FONTS[layer.font];
  const text = layer.uppercase ? layer.text.toUpperCase() : layer.text;
  const lines = text.split("\n");
  const [it] = animateItems(
    {
      items: [{ x: layer.x * W, y: layer.y * H, size: px, rotation: (layer.rotation * Math.PI) / 180, index: 0, rand: 0.25 }],
      bounds: { minX: -W, minY: -H, spanX: W * 3, spanY: H * 3, parallax: false },
    },
    layer.anim,
    f.p,
  );
  if (!enter(ctx, it)) return;
  ctx.font = `${layer.weight} ${px}px ${font.family}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${layer.letterSpacing * px}px`;
  ctx.textAlign = layer.align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = layer.color;
  const lh = px * layer.lineHeight;
  const top = -((lines.length - 1) * lh) / 2;
  lines.forEach((line, i) => ctx.fillText(line, 0, top + i * lh));
  ctx.restore();
}

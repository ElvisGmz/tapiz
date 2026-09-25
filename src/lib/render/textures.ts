import { hexToRgb, rgba } from "../color";
import { mulberry32 } from "../random";
import type { TextureLayer } from "../types";
import { type AnyCanvas, type AnyCtx, createCanvas, ctx2d } from "./canvas";
import type { Frame } from "./index";
import { isAnimated, noiseOrbit } from "./motion";
import { fbm } from "./noise";

const cache = new Map<string, AnyCanvas>();

/** Noise bitmaps are generated at a resolution relative to the output, so preview and export look alike. */
function noiseCanvas(key: string, w: number, h: number, paint: (img: ImageData) => void) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = createCanvas(w, h);
  const cx = ctx2d(c);
  const img = cx.createImageData(c.width, c.height);
  paint(img);
  cx.putImageData(img, 0, 0);
  if (cache.size > 12) cache.delete(cache.keys().next().value!);
  cache.set(key, c);
  return c;
}

export function drawTexture(ctx: AnyCtx, source: TextureLayer, W: number, H: number, f?: Frame) {
  const min = Math.min(W, H);
  const unit = (min / 1000) * source.scale; // one "texture pixel" in output px
  const anim = source.anim;
  const phase = f?.p ?? 0;
  // Film-grain style flicker: a new noise seed 12 times per second.
  const layer = anim?.kind === "flicker" && f ? { ...source, seed: source.seed + Math.floor(f.t * 12) } : source;
  const pulse = anim?.kind === "pulse" && isAnimated(anim) ? 1 + Math.sin(Math.PI * 2 * phase * Math.max(1, Math.round(anim.speed))) * anim.amount * 0.5 : 1;
  const k = Math.min(1, layer.intensity * pulse);
  const [ox, oy] = noiseOrbit(anim, phase, 0.6);
  const rng = mulberry32(layer.seed);

  switch (layer.texture) {
    case "grain":
    case "color-noise": {
      const nw = Math.ceil(W / unit);
      const nh = Math.ceil(H / unit);
      const color = layer.texture === "color-noise";
      const c = noiseCanvas(`${layer.texture}:${nw}x${nh}:${layer.seed}`, nw, nh, (img) => {
        const r = mulberry32(layer.seed);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          const g = r() * 255;
          d[i] = color ? r() * 255 : g;
          d[i + 1] = color ? r() * 255 : g;
          d[i + 2] = color ? r() * 255 : g;
          d[i + 3] = 255;
        }
      });
      ctx.globalAlpha = k;
      ctx.imageSmoothingEnabled = unit < 2.5;
      ctx.drawImage(c, 0, 0, W, H);
      ctx.globalAlpha = 1;
      break;
    }
    case "paper": {
      const nw = Math.ceil(W / (unit * 2));
      const nh = Math.ceil(H / (unit * 2));
      const c = noiseCanvas(`paper:${nw}x${nh}:${layer.seed}`, nw, nh, (img) => {
        const r = mulberry32(layer.seed);
        const d = img.data;
        for (let y = 0; y < nh; y++)
          for (let x = 0; x < nw; x++) {
            const v = fbm(x / 40, y / 40, layer.seed, 5) * 0.7 + r() * 0.3;
            const i = (y * nw + x) * 4;
            d[i] = d[i + 1] = d[i + 2] = v * 255;
            d[i + 3] = 255;
          }
      });
      ctx.globalAlpha = k;
      ctx.drawImage(c, 0, 0, W, H);
      // Fibers
      ctx.globalAlpha = k * 0.5;
      ctx.lineWidth = Math.max(0.5, unit * 0.6);
      const fibers = Math.round(600 * k * ((W * H) / (min * min)));
      for (let i = 0; i < fibers; i++) {
        const x = rng() * W;
        const y = rng() * H;
        const a = rng() * Math.PI;
        const l = (5 + rng() * 25) * unit;
        ctx.strokeStyle = rng() > 0.5 ? "#ffffff" : "#000000";
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + rng() * l * 0.2, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "halftone": {
      const cell = unit * 14;
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      for (let y = 0, r = 0; y < H + cell; y += cell * 0.866, r++) {
        const off = r % 2 ? cell / 2 : 0;
        for (let x = -cell + off; x < W + cell; x += cell) {
          const v = fbm(x / (min * 0.35) + ox, y / (min * 0.35) + oy, layer.seed, 3);
          const rad = Math.max(0, (v - 0.5 + k) * cell * 0.55);
          if (rad < 0.3) continue;
          ctx.moveTo(x + rad, y);
          ctx.arc(x, y, rad, 0, Math.PI * 2);
        }
      }
      ctx.fill();
      break;
    }
    case "scanlines": {
      const gap = unit * 4;
      ctx.fillStyle = rgba(layer.color, k);
      for (let y = 0; y < H; y += gap) ctx.fillRect(0, y, W, gap / 2);
      break;
    }
    case "vignette": {
      const g = ctx.createRadialGradient(W / 2, H / 2, min * 0.25 * (1.6 - k), W / 2, H / 2, Math.hypot(W, H) / 2);
      g.addColorStop(0, rgba(layer.color, 0));
      g.addColorStop(1, rgba(layer.color, Math.min(1, k * 1.2)));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      break;
    }
    case "canvas": {
      const gap = unit * 3;
      ctx.lineWidth = gap * 0.5;
      for (let v = 0; v < Math.max(W, H); v += gap) {
        ctx.strokeStyle = rgba(rng() > 0.5 ? "#ffffff" : "#000000", k * (0.2 + rng() * 0.5));
        ctx.beginPath();
        ctx.moveTo(v, 0);
        ctx.lineTo(v, H);
        ctx.stroke();
        ctx.strokeStyle = rgba(rng() > 0.5 ? "#ffffff" : "#000000", k * (0.2 + rng() * 0.5));
        ctx.beginPath();
        ctx.moveTo(0, v);
        ctx.lineTo(W, v);
        ctx.stroke();
      }
      break;
    }
    case "speckle": {
      const n = Math.round(4000 * k * ((W * H) / (min * min)));
      const [r, g, b] = hexToRgb(layer.color);
      for (let i = 0; i < n; i++) {
        const rad = unit * (0.4 + rng() ** 3 * 3);
        ctx.fillStyle = `rgba(${r},${g},${b},${0.3 + rng() * 0.7})`;
        ctx.beginPath();
        ctx.arc(rng() * W, rng() * H, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "glow": {
      const spots = 3;
      for (let i = 0; i < spots; i++) {
        const x = rng() * W + ox * min * 0.5;
        const y = rng() * H + oy * min * 0.5;
        const r = min * (0.3 + rng() * 0.5) * (layer.scale / 2);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rgba(layer.color, k));
        g.addColorStop(1, rgba(layer.color, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      break;
    }
  }
}

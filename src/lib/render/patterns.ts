import type { PatternLayer } from "../types";
import type { Frame } from "./index";
import { isAnimated, noiseOrbit, patternRotation, patternShift } from "./motion";
import { fbm, fbm4 } from "./noise";

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Horizontal/vertical repeat of each tiled pattern (in cells), so animated shifts land back on the same tiling. */
const PERIOD: Partial<Record<PatternLayer["pattern"], [number, number]>> = {
  dots: [1, 1],
  grid: [1, 1],
  lines: [0, 1],
  diagonal: [0, 1],
  checker: [2, 2],
  waves: [2, 0],
  zigzag: [2, 0],
  triangles: [1, 0],
  hexagons: [Math.sqrt(3) / 2, 0],
  scales: [1, 0],
  plus: [1, 1],
  crosshatch: [1, 0],
  diamonds: [1, 1],
};

export function drawPattern(ctx: Ctx, layer: PatternLayer, W: number, H: number, f?: Frame) {
  const phase = f?.p ?? 0;
  const shift = patternShift(layer.anim, phase);
  const extraRot = patternRotation(layer.anim, phase);
  const min = Math.min(W, H);
  const cell = Math.max(3, layer.size * min);
  const t = Math.max(0.02, layer.thickness);
  ctx.fillStyle = layer.color;
  ctx.strokeStyle = layer.color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Patterns anchored to the canvas center.
  if (layer.pattern === "rings") {
    const cx = W / 2;
    const cy = H / 2;
    ctx.lineWidth = t * cell * 0.5;
    const max = Math.hypot(W, H) / 2;
    for (let r = cell * (shift || 1); r < max + cell; r += cell) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    return;
  }
  if (layer.pattern === "rays") {
    const n = Math.max(6, Math.min(120, Math.round(1.5 / layer.size)));
    const R = Math.hypot(W, H);
    const span = (Math.PI * 2) / n;
    const rot = ((layer.rotation + extraRot) * Math.PI) / 180 + shift * span * 2;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = rot + i * span;
      ctx.moveTo(W / 2, H / 2);
      ctx.arc(W / 2, H / 2, R, a, a + span * Math.min(0.95, t));
      ctx.closePath();
    }
    ctx.fill();
    return;
  }
  if (layer.pattern === "topography") {
    drawTopography(ctx, layer, W, H, cell, t, phase);
    return;
  }

  // Tiled patterns: draw in a rotated frame big enough to cover the canvas.
  const D = Math.hypot(W, H) / 2 + cell * 2;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(((layer.rotation + extraRot + (layer.pattern === "diagonal" ? 45 : 0)) * Math.PI) / 180);
  const [px, py] = PERIOD[layer.pattern] ?? [0, 0];
  ctx.translate(shift * px * cell, shift * py * cell);
  const n = Math.ceil(D / cell);
  const start = -n * cell;
  const end = n * cell;

  switch (layer.pattern) {
    case "dots": {
      const r = (t * cell) / 2;
      ctx.beginPath();
      for (let y = start; y <= end; y += cell)
        for (let x = start; x <= end; x += cell) {
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, Math.PI * 2);
        }
      ctx.fill();
      break;
    }
    case "grid": {
      ctx.lineWidth = t * cell * 0.25;
      ctx.beginPath();
      for (let v = start; v <= end; v += cell) {
        ctx.moveTo(v, start);
        ctx.lineTo(v, end);
        ctx.moveTo(start, v);
        ctx.lineTo(end, v);
      }
      ctx.stroke();
      break;
    }
    case "lines":
    case "diagonal": {
      const th = t * cell * 0.5;
      for (let y = start; y <= end; y += cell) ctx.fillRect(start, y - th / 2, end - start, th);
      break;
    }
    case "checker": {
      for (let y = start, r = 0; y <= end; y += cell, r++)
        for (let x = start, c = 0; x <= end; x += cell, c++) if ((r + c) % 2 === 0) ctx.fillRect(x, y, cell, cell);
      break;
    }
    case "waves":
    case "zigzag": {
      ctx.lineWidth = t * cell * 0.25;
      const amp = cell * 0.28;
      const wl = cell * 2;
      ctx.beginPath();
      for (let y = start; y <= end; y += cell) {
        ctx.moveTo(start, y);
        if (layer.pattern === "zigzag") {
          for (let x = start, k = 0; x <= end + wl; x += wl / 2, k++) ctx.lineTo(x, y + (k % 2 ? amp : -amp));
        } else {
          for (let x = start; x <= end; x += cell / 8) ctx.lineTo(x, y + Math.sin(((x - start) / wl) * Math.PI * 2) * amp);
        }
      }
      ctx.stroke();
      break;
    }
    case "triangles": {
      const h = cell * 0.866;
      ctx.beginPath();
      for (let y = start, r = 0; y <= end; y += h, r++) {
        const off = r % 2 ? cell / 2 : 0;
        for (let x = start + off; x <= end; x += cell) {
          ctx.moveTo(x, y + h);
          ctx.lineTo(x + cell / 2, y);
          ctx.lineTo(x + cell, y + h);
          ctx.closePath();
        }
      }
      if (t > 0.6) ctx.fill();
      else {
        ctx.lineWidth = t * cell * 0.25;
        ctx.stroke();
      }
      break;
    }
    case "hexagons": {
      const r = cell / 2;
      const hw = Math.sqrt(3) * r;
      ctx.lineWidth = t * cell * 0.2;
      ctx.beginPath();
      for (let y = start, row = 0; y <= end; y += r * 1.5, row++) {
        const off = row % 2 ? hw / 2 : 0;
        for (let x = start + off; x <= end; x += hw) {
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i + Math.PI / 6;
            const px = x + Math.cos(a) * r;
            const py = y + Math.sin(a) * r;
            if (i) ctx.lineTo(px, py);
            else ctx.moveTo(px, py);
          }
          ctx.closePath();
        }
      }
      ctx.stroke();
      break;
    }
    case "scales": {
      const r = cell / 2;
      ctx.lineWidth = t * cell * 0.2;
      for (let y = start, row = 0; y <= end; y += r, row++) {
        const off = row % 2 ? r : 0;
        ctx.beginPath();
        for (let x = start + off; x <= end; x += cell) {
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, Math.PI);
        }
        ctx.stroke();
      }
      break;
    }
    case "plus": {
      const arm = cell * 0.22;
      ctx.lineWidth = t * cell * 0.2;
      ctx.beginPath();
      for (let y = start; y <= end; y += cell)
        for (let x = start; x <= end; x += cell) {
          ctx.moveTo(x - arm, y);
          ctx.lineTo(x + arm, y);
          ctx.moveTo(x, y - arm);
          ctx.lineTo(x, y + arm);
        }
      ctx.stroke();
      break;
    }
    case "crosshatch": {
      ctx.lineWidth = t * cell * 0.15;
      ctx.beginPath();
      for (let v = start * 2; v <= end * 2; v += cell) {
        ctx.moveTo(v, start);
        ctx.lineTo(v + (end - start), end);
        ctx.moveTo(v, end);
        ctx.lineTo(v + (end - start), start);
      }
      ctx.stroke();
      break;
    }
    case "diamonds": {
      const s = (cell / 2) * Math.min(1, t + 0.15);
      ctx.beginPath();
      for (let y = start, r = 0; y <= end; y += cell / 2, r++) {
        const off = r % 2 ? cell / 2 : 0;
        for (let x = start + off; x <= end; x += cell) {
          ctx.moveTo(x, y - s / 2);
          ctx.lineTo(x + s / 2, y);
          ctx.lineTo(x, y + s / 2);
          ctx.lineTo(x - s / 2, y);
          ctx.closePath();
        }
      }
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

/** Contour lines over a smooth noise field (marching squares). */
function drawTopography(ctx: Ctx, layer: PatternLayer, W: number, H: number, cell: number, t: number, phase: number) {
  const anim = layer.anim;
  const [ox, oy] = noiseOrbit(anim, phase);
  // "morph": the terrain itself evolves — hills grow, merge and split — by circling through two extra noise dimensions.
  const morph = isAnimated(anim) && anim.kind === "morph";
  const theta = morph ? Math.PI * 2 * phase * Math.max(1, Math.round(anim.speed)) : 0;
  const r = morph ? 0.4 + anim.amount * 1.6 : 0;
  const mz = Math.cos(theta) * r;
  const mw = Math.sin(theta) * r;
  const long = Math.max(W, H);
  const step = long / 220;
  const cols = Math.ceil(W / step) + 1;
  const rows = Math.ceil(H / step) + 1;
  const freq = 1 / (cell * 4);
  const field = new Float32Array(cols * rows);
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) field[j * cols + i] = morph
        ? fbm4(i * step * freq, j * step * freq, mz, mw, layer.seed, 3)
        : fbm(i * step * freq + ox, j * step * freq + oy, layer.seed, 3);

  const levels = 14;
  ctx.lineWidth = Math.max(1, t * Math.min(W, H) * 0.004);
  ctx.beginPath();
  for (let l = 1; l < levels; l++) {
    const iso = 0.2 + (l / levels) * 0.6;
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const a = field[j * cols + i];
        const b = field[j * cols + i + 1];
        const c = field[(j + 1) * cols + i + 1];
        const d = field[(j + 1) * cols + i];
        const idx = (a > iso ? 8 : 0) | (b > iso ? 4 : 0) | (c > iso ? 2 : 0) | (d > iso ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        const x = i * step;
        const y = j * step;
        const lerp = (v1: number, v2: number) => (iso - v1) / (v2 - v1 || 1e-6);
        const top: [number, number] = [x + lerp(a, b) * step, y];
        const right: [number, number] = [x + step, y + lerp(b, c) * step];
        const bottom: [number, number] = [x + lerp(d, c) * step, y + step];
        const left: [number, number] = [x, y + lerp(a, d) * step];
        const seg = (p: [number, number], q: [number, number]) => {
          ctx.moveTo(p[0], p[1]);
          ctx.lineTo(q[0], q[1]);
        };
        switch (idx) {
          case 1: case 14: seg(left, bottom); break;
          case 2: case 13: seg(bottom, right); break;
          case 3: case 12: seg(left, right); break;
          case 4: case 11: seg(top, right); break;
          case 5: seg(left, top); seg(bottom, right); break;
          case 6: case 9: seg(top, bottom); break;
          case 7: case 8: seg(left, top); break;
          case 10: seg(top, right); seg(left, bottom); break;
        }
      }
    }
  }
  ctx.stroke();
}

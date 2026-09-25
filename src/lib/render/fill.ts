import { rgba } from "../color";
import type { Fill, GradientStop } from "../types";

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function addStops(g: CanvasGradient, stops: GradientStop[]) {
  const sorted = [...stops].sort((a, b) => a.pos - b.pos);
  for (const s of sorted) g.addColorStop(Math.min(1, Math.max(0, s.pos)), s.color);
}

/** Builds a fillStyle for the box (x, y, w, h). Mesh fills fall back to their base color. */
export function makeFillStyle(ctx: Ctx, fill: Fill, x: number, y: number, w: number, h: number) {
  switch (fill.kind) {
    case "solid":
      return fill.color;
    case "mesh":
      return fill.base;
    case "linear": {
      // CSS convention: 0deg points up, 90deg points right.
      const a = (fill.angle * Math.PI) / 180;
      const dx = Math.sin(a);
      const dy = -Math.cos(a);
      const len = Math.abs(w * dx) + Math.abs(h * dy);
      const cx = x + w / 2;
      const cy = y + h / 2;
      const g = ctx.createLinearGradient(cx - (dx * len) / 2, cy - (dy * len) / 2, cx + (dx * len) / 2, cy + (dy * len) / 2);
      addStops(g, fill.stops);
      return g;
    }
    case "radial": {
      const cx = x + fill.cx * w;
      const cy = y + fill.cy * h;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, fill.radius * Math.max(w, h)));
      addStops(g, fill.stops);
      return g;
    }
    case "conic": {
      const g = ctx.createConicGradient(((fill.angle - 90) * Math.PI) / 180, x + fill.cx * w, y + fill.cy * h);
      const stops = [...fill.stops].sort((a, b) => a.pos - b.pos);
      addStops(g, stops);
      // Close the loop so there is no hard seam.
      if (stops.length && stops[stops.length - 1].pos < 1) g.addColorStop(1, stops[0].color);
      return g;
    }
  }
}

/** Paints a fill over a rectangle, including mesh gradients. */
export function paintFill(ctx: Ctx, fill: Fill, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = makeFillStyle(ctx, fill, x, y, w, h);
  ctx.fillRect(x, y, w, h);
  if (fill.kind !== "mesh") return;
  const big = Math.max(w, h);
  for (const p of fill.points) {
    const px = x + p.x * w;
    const py = y + p.y * h;
    const r = Math.max(1, p.radius * big);
    const g = ctx.createRadialGradient(px, py, 0, px, py, r);
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const s = t * t * (3 - 2 * t);
      g.addColorStop(t, rgba(p.color, 1 - s));
    }
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }
}

export function fillColors(fill: Fill): string[] {
  if (fill.kind === "solid") return [fill.color];
  if (fill.kind === "mesh") return [fill.base, ...fill.points.map((p) => p.color)];
  return fill.stops.map((s) => s.color);
}

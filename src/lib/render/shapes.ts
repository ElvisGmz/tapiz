import type { Rng } from "../random";
import type { ShapeKind, ShapeLayer } from "../types";

/** Builds a path centered at (0,0). `s` is the base size (width). */
export function shapePath(layer: ShapeLayer, s: number, rng: Rng): { path: Path2D; w: number; h: number; evenOdd?: boolean } {
  const w = s;
  const h = s / Math.max(0.1, layer.aspect);
  const p = new Path2D();
  const kind: ShapeKind = layer.shape;

  switch (kind) {
    case "circle":
      p.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
      break;
    case "rect":
      p.roundRect(-w / 2, -h / 2, w, h, layer.corner * Math.min(w, h));
      break;
    case "triangle":
      p.moveTo(0, -h / 2);
      p.lineTo(w / 2, h / 2);
      p.lineTo(-w / 2, h / 2);
      p.closePath();
      break;
    case "star":
    case "polygon": {
      const n = Math.max(3, Math.round(layer.points));
      const steps = kind === "star" ? n * 2 : n;
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2 - Math.PI / 2;
        const r = kind === "star" && i % 2 ? layer.inner : 1;
        const x = Math.cos(a) * (w / 2) * r;
        const y = Math.sin(a) * (h / 2) * r;
        if (i) p.lineTo(x, y);
        else p.moveTo(x, y);
      }
      p.closePath();
      break;
    }
    case "blob": {
      const n = 7;
      const pts: [number, number][] = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = 0.68 + rng() * 0.32;
        pts.push([Math.cos(a) * (w / 2) * r, Math.sin(a) * (h / 2) * r]);
      }
      // Closed Catmull-Rom → cubic bezier.
      p.moveTo(pts[0][0], pts[0][1]);
      for (let i = 0; i < n; i++) {
        const p0 = pts[(i - 1 + n) % n];
        const p1 = pts[i];
        const p2 = pts[(i + 1) % n];
        const p3 = pts[(i + 2) % n];
        p.bezierCurveTo(
          p1[0] + (p2[0] - p0[0]) / 6,
          p1[1] + (p2[1] - p0[1]) / 6,
          p2[0] - (p3[0] - p1[0]) / 6,
          p2[1] - (p3[1] - p1[1]) / 6,
          p2[0],
          p2[1],
        );
      }
      p.closePath();
      break;
    }
    case "ring": {
      const t = Math.min(0.95, Math.max(0.05, layer.inner));
      p.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
      p.moveTo(w / 2 - (w / 2) * t, 0);
      p.ellipse(0, 0, (w / 2) * (1 - t), (h / 2) * (1 - t), 0, 0, Math.PI * 2);
      return { path: p, w, h, evenOdd: true };
    }
    case "heart": {
      const x = (v: number) => (v - 0.5) * w;
      const y = (v: number) => (v - 0.5) * h;
      p.moveTo(x(0.5), y(0.95));
      p.bezierCurveTo(x(0.1), y(0.68), x(-0.02), y(0.4), x(0.02), y(0.25));
      p.bezierCurveTo(x(0.08), y(0.02), x(0.4), y(-0.02), x(0.5), y(0.22));
      p.bezierCurveTo(x(0.6), y(-0.02), x(0.92), y(0.02), x(0.98), y(0.25));
      p.bezierCurveTo(x(1.02), y(0.4), x(0.9), y(0.68), x(0.5), y(0.95));
      p.closePath();
      break;
    }
    case "arch": {
      const r = w / 2;
      p.moveTo(-r, h / 2);
      p.lineTo(-r, -h / 2 + r);
      p.arc(0, -h / 2 + r, r, Math.PI, 0);
      p.lineTo(r, h / 2);
      p.closePath();
      break;
    }
    case "plus": {
      const t = Math.max(0.08, layer.inner) * Math.min(w, h) * 0.5;
      const rr = t * 0.35;
      p.roundRect(-t / 2, -h / 2, t, h, rr);
      p.roundRect(-w / 2, -t / 2, w, t, rr);
      break;
    }
    case "squiggle": {
      const waves = Math.max(1, Math.round(layer.points / 2));
      const amp = h * 0.3;
      const thick = Math.max(0.05, layer.inner) * h * 0.5;
      const N = 64;
      const pt = (i: number) => {
        const t = i / N;
        return [-w / 2 + t * w, Math.sin(t * Math.PI * 2 * waves) * amp] as const;
      };
      for (let i = 0; i <= N; i++) {
        const [x, y] = pt(i);
        if (i) p.lineTo(x, y - thick / 2);
        else p.moveTo(x, y - thick / 2);
      }
      for (let i = N; i >= 0; i--) {
        const [x, y] = pt(i);
        p.lineTo(x, y + thick / 2);
      }
      p.closePath();
      break;
    }
    case "flower": {
      const n = Math.max(3, Math.round(layer.points));
      const pr = (Math.min(w, h) / 2) * 0.42;
      const d = (Math.min(w, h) / 2) * 0.58;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const cx = Math.cos(a) * d;
        const cy = Math.sin(a) * d;
        p.moveTo(cx + pr, cy);
        p.arc(cx, cy, pr, 0, Math.PI * 2);
      }
      p.moveTo(d, 0);
      p.arc(0, 0, d, 0, Math.PI * 2);
      break;
    }
  }
  return { path: p, w, h };
}

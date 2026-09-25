import type { Animation, AnimKind, Fill, MotionInfo } from "../types";
import type { Item, Layout } from "./placement";

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

export interface AnimatedItem extends Item {
  alpha: number;
  scale: number;
}

const cycles = (a: Animation) => Math.max(1, Math.round(a.speed));
const wrap = (v: number, min: number, span: number) => ((((v - min) % span) + span) % span) + min;

export function isAnimated(a?: Animation): a is Animation {
  return !!a && a.kind !== "none";
}

export function docIsAnimated(doc: MotionInfo & { layers: { anim?: Animation }[] }) {
  return (doc.backgroundAnim && doc.backgroundAnim.kind !== "none") || doc.layers.some((l) => isAnimated(l.anim));
}

/** Moves/rotates/scales laid-out items for loop phase `p` (0..1). */
export function animateItems(layout: Layout, anim: Animation | undefined, p: number): AnimatedItem[] {
  const { items } = layout;
  if (!isAnimated(anim) || !items.length) return items.map((i) => ({ ...i, alpha: 1, scale: 1 }));
  const k = cycles(anim);
  const a = anim.amount;
  const wave = (it: Item, off = 0) => Math.sin(TAU * (p * k + it.rand + off));

  switch (anim.kind) {
    case "drift": {
      const rad = anim.angle * DEG;
      const kx = Math.round(Math.cos(rad) * k);
      const ky = Math.round(Math.sin(rad) * k);
      const { minX, minY, spanX, spanY, parallax } = layout.bounds;
      return items.map((it) => {
        // Parallax: some scattered items travel twice as far — still a whole number of wraps.
        const f = parallax && it.rand < a ? 2 : 1;
        return {
          ...it,
          x: wrap(it.x + kx * f * spanX * p, minX, spanX),
          y: wrap(it.y + ky * f * spanY * p, minY, spanY),
          alpha: 1,
          scale: 1,
        };
      });
    }
    case "float":
      return items.map((it) => ({
        ...it,
        x: it.x + Math.cos(TAU * (p * k + it.rand * 1.7)) * a * it.size * 0.12,
        y: it.y + wave(it) * a * it.size * 0.35,
        alpha: 1,
        scale: 1,
      }));
    case "sway":
      return items.map((it) => ({ ...it, rotation: it.rotation + wave(it) * a * 0.5, alpha: 1, scale: 1 }));
    case "spin":
      return items.map((it) => ({ ...it, rotation: it.rotation + TAU * p * k * (it.rand < 0.5 ? -1 : 1), alpha: 1, scale: 1 }));
    case "pulse":
      return items.map((it) => ({ ...it, alpha: 1, scale: 1 + wave(it) * a * 0.3 }));
    case "twinkle":
      return items.map((it) => ({ ...it, alpha: 1 - a * (0.5 + 0.5 * wave(it)), scale: 1 }));
    default:
      return items.map((i) => ({ ...i, alpha: 1, scale: 1 }));
  }
}

/** Offset for tiled patterns: a fraction of one period, so the tiling never shows a jump. */
export function patternShift(anim: Animation | undefined, p: number) {
  if (!isAnimated(anim) || (anim.kind !== "drift" && anim.kind !== "flow")) return 0;
  const v = p * cycles(anim) * 2;
  return v - Math.floor(v);
}

export function patternRotation(anim: Animation | undefined, p: number) {
  if (!isAnimated(anim)) return 0;
  if (anim.kind === "spin") return 360 * p * cycles(anim);
  if (anim.kind === "sway") return Math.sin(TAU * p * cycles(anim)) * anim.amount * 15;
  return 0;
}

/** Circular offset in noise space: moving around a circle comes back to the start. */
export function noiseOrbit(anim: Animation | undefined, p: number, radius = 1.5): [number, number] {
  if (!isAnimated(anim) || (anim.kind !== "flow" && anim.kind !== "drift")) return [0, 0];
  const t = TAU * p * cycles(anim);
  return [Math.cos(t) * radius * anim.amount, Math.sin(t) * radius * anim.amount];
}

export function animatedBackground(fill: Fill, bg: MotionInfo["backgroundAnim"], p: number): Fill {
  if (!bg || bg.kind === "none") return fill;
  const k = Math.max(1, Math.round(bg.speed));
  const a = bg.amount;
  const t = TAU * p * k;
  switch (fill.kind) {
    case "mesh":
      return {
        ...fill,
        points: fill.points.map((pt, i) => {
          const o = (i / Math.max(1, fill.points.length)) * TAU;
          const r = bg.kind === "breathe" ? 1 + Math.sin(t + o) * a * 0.35 : 1;
          return {
            ...pt,
            x: bg.kind === "breathe" ? pt.x : pt.x + Math.cos(t + o) * a * 0.18,
            y: bg.kind === "breathe" ? pt.y : pt.y + Math.sin(t + o * 1.3) * a * 0.18,
            radius: pt.radius * r,
          };
        }),
      };
    case "linear":
      return { ...fill, angle: bg.kind === "rotate" ? fill.angle + 360 * p * k : fill.angle + Math.sin(t) * a * 40 };
    case "conic":
      return { ...fill, angle: fill.angle + (bg.kind === "rotate" ? 360 * p * k : Math.sin(t) * a * 40) };
    case "radial":
      return bg.kind === "breathe"
        ? { ...fill, radius: fill.radius * (1 + Math.sin(t) * a * 0.3) }
        : { ...fill, cx: fill.cx + Math.cos(t) * a * 0.2, cy: fill.cy + Math.sin(t) * a * 0.2 };
    default:
      return fill;
  }
}

/** Which animations make sense for each layer type (drives the UI). */
export const ANIMS_FOR: Record<string, AnimKind[]> = {
  shape: ["none", "drift", "float", "sway", "spin", "pulse", "twinkle"],
  emoji: ["none", "drift", "float", "sway", "spin", "pulse", "twinkle"],
  icon: ["none", "drift", "float", "sway", "spin", "pulse", "twinkle"],
  image: ["none", "drift", "float", "sway", "spin", "pulse", "twinkle"],
  text: ["none", "float", "sway", "pulse", "twinkle"],
  pattern: ["none", "drift", "spin", "sway", "morph"],
  texture: ["none", "flicker", "flow", "pulse"],
};

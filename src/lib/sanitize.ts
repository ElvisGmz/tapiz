import { createLayer } from "./factory";
import { FONTS } from "./fonts";
import { uid } from "./random";
import type { Fill, Layer, LayerType, Scene, WallpaperDoc } from "./types";

/**
 * Designs can arrive from untrusted places (share links, the /live link, old localStorage).
 * Rebuild them from known-good defaults: unknown keys are dropped, enums must match,
 * colors must be hex, and every number is clamped so a crafted link can't freeze the tab.
 */

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const LAYER_TYPES: LayerType[] = ["shape", "emoji", "icon", "pattern", "texture", "text", "image"];

const CLAMPS: Record<string, [number, number]> = {
  count: [0, 600],
  size: [0.005, 5],
  sizeMin: [0.002, 3],
  sizeMax: [0.002, 3],
  spacing: [0.02, 2],
  jitter: [0, 1],
  scale: [0.3, 8],
  points: [3, 24],
  inner: [0, 1],
  aspect: [0.1, 10],
  corner: [0, 0.5],
  opacity: [0, 1],
  intensity: [0, 1],
  amount: [0, 1],
  speed: [1, 4],
  thickness: [0, 1.5],
  blur: [0, 20],
  x: [-3, 4],
  y: [-3, 4],
  zoom: [0.1, 5],
  radius: [0, 3],
  pos: [0, 1],
  cx: [-1, 2],
  cy: [-1, 2],
  focusX: [0, 1],
  focusY: [0, 1],
  rotation: [-3600, 3600],
  randomRotation: [0, 360],
  angle: [-3600, 3600],
  hue: [-360, 360],
  weight: [100, 900],
  letterSpacing: [-1, 2],
  lineHeight: [0.5, 4],
  strokeWidth: [0.1, 10],
  width: [0, 20],
  brightness: [0, 4],
  contrast: [0, 4],
  saturation: [0, 4],
  grayscale: [0, 1],
  seed: [0, 2 ** 31],
  hour: [0, 24],
};

const ENUMS: Record<string, readonly string[]> = {
  shape: ["circle", "rect", "triangle", "star", "polygon", "blob", "ring", "heart", "arch", "plus", "squiggle", "flower"],
  pattern: ["dots", "grid", "lines", "diagonal", "checker", "waves", "zigzag", "triangles", "hexagons", "scales", "plus", "crosshatch", "diamonds", "rings", "rays", "topography"],
  texture: ["grain", "color-noise", "paper", "halftone", "scanlines", "vignette", "canvas", "speckle", "glow"],
  font: Object.keys(FONTS),
  style: ["twemoji", "openmoji", "system"],
  mode: ["single", "scatter", "grid", "fill", "items"],
  fit: ["cover", "contain"],
  frame: ["none", "rounded", "circle", "polaroid", "arch", "blob"],
  blend: ["source-over", "multiply", "screen", "overlay", "soft-light", "hard-light", "color-dodge", "color-burn", "lighten", "darken", "difference", "exclusion", "hue", "saturation", "color", "luminosity"],
  align: ["left", "center", "right"],
  colorMode: ["fill", "palette"],
  kind: ["none", "drift", "float", "sway", "spin", "pulse", "twinkle", "flow", "flicker", "morph"],
};

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.slice(0, max) : undefined);
const color = (v: unknown, fallback: string) => (typeof v === "string" && HEX.test(v) ? v : fallback);

function num(key: string, v: unknown, fallback: number) {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  const r = CLAMPS[key];
  return r ? Math.min(r[1], Math.max(r[0], v)) : v;
}

/** Copies `raw` onto `template`, keeping only keys/types the template knows. */
function merge<T>(template: T, raw: unknown, key = ""): T {
  if (Array.isArray(template)) return template; // arrays are handled explicitly by callers
  if (!isObj(template)) {
    if (typeof template === "number") return num(key, raw, template) as T;
    if (typeof template === "boolean") return (typeof raw === "boolean" ? raw : template) as T;
    if (typeof template === "string") {
      if (HEX.test(template)) return color(raw, template) as T;
      if (ENUMS[key]) return (typeof raw === "string" && ENUMS[key].includes(raw) ? raw : template) as T;
      return (str(raw, key === "text" ? 500 : 80) ?? template) as T;
    }
    return template;
  }
  if (!isObj(raw)) return template;
  const out: Record<string, unknown> = {};
  for (const [k, def] of Object.entries(template as Record<string, unknown>)) out[k] = merge(def, raw[k], k);
  return out as T;
}

const list = <T>(v: unknown, max: number, map: (x: unknown) => T | undefined): T[] =>
  Array.isArray(v) ? v.slice(0, max).map(map).filter((x): x is T => x !== undefined) : [];

function fill(raw: unknown, fallback: Fill): Fill {
  if (!isObj(raw)) return fallback;
  const stops = () => {
    const s = list(raw.stops, 10, (x) => (isObj(x) ? { color: color(x.color, "#000000"), pos: num("pos", x.pos, 0) } : undefined));
    return s.length >= 1 ? s : [{ color: "#000000", pos: 0 }, { color: "#ffffff", pos: 1 }];
  };
  switch (raw.kind) {
    case "solid":
      return { kind: "solid", color: color(raw.color, "#000000") };
    case "linear":
      return { kind: "linear", angle: num("angle", raw.angle, 0), stops: stops() };
    case "radial":
      return { kind: "radial", cx: num("cx", raw.cx, 0.5), cy: num("cy", raw.cy, 0.5), radius: num("radius", raw.radius, 0.7), stops: stops() };
    case "conic":
      return { kind: "conic", cx: num("cx", raw.cx, 0.5), cy: num("cy", raw.cy, 0.5), angle: num("angle", raw.angle, 0), stops: stops() };
    case "mesh":
      return {
        kind: "mesh",
        base: color(raw.base, "#000000"),
        points: list(raw.points, 10, (p) =>
          isObj(p) ? { x: num("x", p.x, 0.5), y: num("y", p.y, 0.5), radius: num("radius", p.radius, 0.5), color: color(p.color, "#ffffff") } : undefined,
        ),
      };
    default:
      return fallback;
  }
}

function layer(raw: unknown): Layer | undefined {
  if (!isObj(raw) || !LAYER_TYPES.includes(raw.type as LayerType)) return undefined;
  const base = createLayer(raw.type as LayerType);
  const out = merge(base, raw) as Layer & Record<string, unknown>;
  out.id = str(raw.id, 40) ?? uid();
  out.type = base.type as never;
  if ("fill" in base) out.fill = fill(raw.fill, base.fill);
  if (isObj(raw.anim)) out.anim = merge({ kind: "none", speed: 1, amount: 0.5, angle: 270 } as const, raw.anim) as Layer["anim"];
  const strings = (v: unknown, max: number, re?: RegExp) => list(v, max, (x) => (typeof x === "string" && x.length <= 40 && (!re || re.test(x)) ? x : undefined));
  if (out.type === "shape") out.palette = list(raw.palette, 20, (c) => (typeof c === "string" && HEX.test(c) ? c : undefined));
  if (out.type === "emoji") out.chars = strings(raw.chars, 60);
  if (out.type === "icon") {
    out.icons = strings(raw.icons, 60, /^[A-Za-z0-9]+$/);
    out.colors = list(raw.colors, 20, (c) => (typeof c === "string" && HEX.test(c) ? c : undefined));
  }
  if (out.type === "image") out.images = strings(raw.images, 40, /^[a-z0-9]+$/i);
  return out;
}

export function sanitizeDoc(raw: unknown): WallpaperDoc | null {
  if (!isObj(raw)) return null;
  const doc: WallpaperDoc = {
    width: Math.round(Math.min(10000, Math.max(16, num("", raw.width, 3840)))),
    height: Math.round(Math.min(10000, Math.max(16, num("", raw.height, 2160)))),
    background: fill(raw.background, { kind: "solid", color: "#111111" }),
    layers: list(raw.layers, 60, layer),
  };
  if (typeof raw.loop === "number" && Number.isFinite(raw.loop)) doc.loop = Math.min(60, Math.max(2, raw.loop));
  if (isObj(raw.backgroundAnim)) {
    const k = raw.backgroundAnim.kind;
    doc.backgroundAnim = {
      kind: k === "shift" || k === "rotate" || k === "breathe" ? k : "none",
      speed: num("speed", raw.backgroundAnim.speed, 1),
      amount: num("amount", raw.backgroundAnim.amount, 0.5),
    };
  }
  if (Array.isArray(raw.scenes) && raw.scenes.length) {
    const scenes = list(raw.scenes, 8, (s): Scene | undefined =>
      isObj(s)
        ? {
            id: str(s.id, 40) ?? uid(),
            name: str(s.name, 40) ?? "Escena",
            hour: num("hour", s.hour, 12),
            appearance: s.appearance === "dark" ? "dark" : "light",
            kind: (["day", "night", "sunset", "dawn", "copy"] as const).find((k) => k === s.kind),
            background: fill(s.background, doc.background),
            layers: list(s.layers, 60, layer),
          }
        : undefined,
    );
    if (scenes.length) {
      doc.scenes = scenes;
      doc.activeScene = Math.min(scenes.length - 1, Math.max(0, Math.round(num("", raw.activeScene, 0))));
      doc.dynamicMode = raw.dynamicMode === "time" ? "time" : "appearance";
    }
  }
  return doc;
}

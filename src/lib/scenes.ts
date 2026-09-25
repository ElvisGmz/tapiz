import { hexToHsl, hexToRgb, hslToHex, hueToward } from "./color";
import { icon } from "./factory";
import { uid } from "./random";
import type { Layer, Scene, WallpaperDoc } from "./types";

const HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;

/** Applies `fn` to every hex color in a design (8-digit colors keep their alpha). */
export function mapColors<T>(design: T, fn: (hex: string) => string): T {
  const walk = (v: unknown): unknown => {
    if (typeof v === "string" && HEX.test(v)) return fn(v.slice(0, 7)) + v.slice(7);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(design) as T;
}

const clamp = (v: number, a = 0, b = 100) => Math.min(b, Math.max(a, v));

function tint(hex: string, with_: string, t: number) {
  const a = hexToRgb(hex);
  const b = hexToRgb(with_);
  const to = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return `#${a.map((v, i) => to(v + (b[i] - v) * t)).join("")}`;
}

export type SceneKind = "night" | "sunset" | "dawn" | "copy";

export const SCENE_PRESETS: Record<SceneKind, { name: string; emoji: string; hour: number; appearance: Scene["appearance"] }> = {
  night: { name: "Noche", emoji: "🌙", hour: 20, appearance: "dark" },
  sunset: { name: "Atardecer", emoji: "🌇", hour: 17.5, appearance: "light" },
  dawn: { name: "Amanecer", emoji: "🌅", hour: 6, appearance: "light" },
  copy: { name: "Copia", emoji: "📄", hour: 12, appearance: "light" },
};

const transforms: Record<SceneKind, (hex: string) => string> = {
  night: (hex) => {
    const [h, s, l] = hexToHsl(hex);
    return hslToHex(hueToward(h, 232, 0.5), clamp(s * 0.7 + 8), clamp(4 + 42 * (l / 100) ** 1.25));
  },
  // Warm variants tint in RGB: rotating hue from e.g. teal toward orange would pass through green.
  sunset: (hex) => {
    const [h, s, l] = hexToHsl(tint(hex, "#ff6a3d", 0.38));
    return hslToHex(h, clamp(s * 1.1), clamp(l * 0.9));
  },
  dawn: (hex) => {
    const [h, s, l] = hexToHsl(tint(hex, "#ffb0c8", 0.3));
    return hslToHex(h, clamp(s * 0.9), clamp(l * 0.92 + 6));
  },
  copy: (hex) => hex,
};

function freshIds(layers: Layer[]): Layer[] {
  return layers.map((l) => ({ ...structuredClone(l), id: uid() }));
}

export function deriveScene(from: Pick<WallpaperDoc, "background" | "layers">, kind: SceneKind, addStars = true): Scene {
  const p = SCENE_PRESETS[kind];
  const design = mapColors({ background: from.background, layers: freshIds(from.layers) }, transforms[kind]);
  let layers = design.layers;
  if (kind === "night") {
    // Emojis can't be recolored, so let them sit back a bit at night.
    layers = layers.map((l) => (l.type === "emoji" ? { ...l, opacity: l.opacity * 0.8 } : l));
    if (addStars)
      layers.push(
        icon({
          name: "Estrellas",
          icons: ["Sparkle", "Star"],
          colors: ["#fff6d5", "#ffffff"],
          filled: true,
          opacity: 0.85,
          shadow: { enabled: true, color: "#fff6d5", blur: 0.8, x: 0, y: 0 },
          placement: { mode: "scatter", count: 55, sizeMin: 0.008, sizeMax: 0.026, randomRotation: 30 },
        }),
      );
  }
  return { id: uid(), name: p.name, hour: p.hour, appearance: p.appearance, kind, background: design.background, layers };
}

/** Scenes with the active one refreshed from the live top-level design. */
export function syncScenes(doc: WallpaperDoc): Scene[] {
  const scenes = doc.scenes ?? [];
  const i = doc.activeScene ?? 0;
  return scenes.map((s, j) => (j === i ? { ...s, background: doc.background, layers: doc.layers } : s));
}

export function switchScene(doc: WallpaperDoc, to: number): WallpaperDoc {
  const scenes = syncScenes(doc);
  const s = scenes[to];
  if (!s) return doc;
  return { ...doc, scenes, activeScene: to, background: s.background, layers: s.layers };
}

export function makeDynamic(doc: WallpaperDoc, addStars = true): WallpaperDoc {
  const day: Scene = { id: uid(), name: "Día", hour: 8, appearance: "light", kind: "day", background: doc.background, layers: doc.layers };
  const night = deriveScene(doc, "night", addStars);
  return { ...doc, scenes: [day, night], activeScene: 0, dynamicMode: "appearance" };
}

export function addScene(doc: WallpaperDoc, kind: SceneKind): WallpaperDoc {
  const scenes = syncScenes(doc);
  // Time-of-day variants start from the daytime design; "copy" duplicates what you're looking at.
  const from = kind === "copy" ? (doc.activeScene ?? 0) : appearanceIndexes(scenes).light;
  const base = scenes[from] ?? { background: doc.background, layers: doc.layers };
  const scene = deriveScene(base, kind);
  return switchScene({ ...doc, scenes: [...scenes, scene] }, scenes.length);
}

export function removeScene(doc: WallpaperDoc, index: number): WallpaperDoc {
  const scenes = syncScenes(doc).filter((_, i) => i !== index);
  if (!scenes.length) return exitDynamic(doc);
  const active = Math.min(scenes.length - 1, Math.max(0, (doc.activeScene ?? 0) - (index <= (doc.activeScene ?? 0) ? 1 : 0)));
  const s = scenes[active];
  return { ...doc, scenes, activeScene: active, background: s.background, layers: s.layers };
}

export function exitDynamic(doc: WallpaperDoc): WallpaperDoc {
  return { width: doc.width, height: doc.height, background: doc.background, layers: doc.layers };
}

/** Which scene macOS shows at `hour` in time mode: the latest one that already started (wrapping around midnight). */
export function sceneAtHour(scenes: Scene[], hour: number) {
  const sorted = scenes.map((s, i) => ({ s, i })).sort((a, b) => a.s.hour - b.s.hour);
  const before = sorted.filter((x) => x.s.hour <= hour);
  return (before.length ? before[before.length - 1] : sorted[sorted.length - 1])?.i ?? 0;
}

export function appearanceIndexes(scenes: Scene[]) {
  const light = Math.max(0, scenes.findIndex((s) => s.appearance === "light"));
  const darkIdx = scenes.findIndex((s) => s.appearance === "dark");
  return { light, dark: darkIdx >= 0 ? darkIdx : scenes.length - 1 };
}

/** Re-derives every scene from a new day design, keeping names, hours and appearance ("Sorpréndeme" in sync). */
export function resyncScenes(doc: WallpaperDoc, day: Pick<WallpaperDoc, "background" | "layers">): WallpaperDoc {
  const scenes = syncScenes(doc).map((s) => {
    const kind = s.kind ?? (s.appearance === "dark" ? "night" : "day");
    const next = kind === "day" || kind === "copy" ? { background: day.background, layers: day.layers } : deriveScene(day, kind);
    return { ...s, background: next.background, layers: next.layers };
  });
  const a = doc.activeScene ?? 0;
  return { ...doc, scenes, background: scenes[a].background, layers: scenes[a].layers };
}

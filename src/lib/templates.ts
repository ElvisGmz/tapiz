import { PALETTES } from "./catalog";
import { luminance } from "./color";
import { anim, emoji, icon, pattern, shape, text, texture } from "./factory";
import { mulberry32, pick, randomSeed, shuffle, uid } from "./random";
import { resyncScenes } from "./scenes";
import type { DynamicInfo, DynamicMode, Fill, Layer, MotionInfo, Scene, WallpaperDoc } from "./types";

export type Design = Pick<WallpaperDoc, "background" | "layers"> & DynamicInfo & MotionInfo;

export interface Template {
  id: string;
  name: string;
  tag: string;
  palette: string[];
  build: (p: string[]) => Design;
}

const lin = (angle: number, ...colors: string[]): Fill => ({
  kind: "linear",
  angle,
  stops: colors.map((color, i) => ({ color, pos: colors.length === 1 ? 0 : i / (colors.length - 1) })),
});

type SceneDesign = Pick<WallpaperDoc, "background" | "layers">;
const sceneOf = (name: string, hour: number, appearance: Scene["appearance"], kind: Scene["kind"], d: SceneDesign): Scene => ({
  id: uid(),
  name,
  hour,
  appearance,
  kind,
  ...d,
});

function dayNight(mode: DynamicMode, scenes: Scene[], motion: MotionInfo = {}): Design {
  return { background: scenes[0].background, layers: scenes[0].layers, scenes, activeScene: 0, dynamicMode: mode, ...motion };
}

const glow = (color: string, blur = 4) => ({ enabled: true, color, blur, x: 0, y: 0 });
const noShadow = { enabled: false, color: "#000000", blur: 2, x: 0, y: 0.6 };

function hills(sky: Fill, sun: Layer, h: string[], cloud: string, extras: Layer[] = []): SceneDesign {
  return {
    background: sky,
    layers: [
      ...extras,
      sun,
      shape({ name: "Nubes", shape: "blob", aspect: 2.2, fill: { kind: "solid", color: cloud }, opacity: 0.9, blur: 0.4, anim: anim("drift", { angle: 0, amount: 0.4 }), placement: { mode: "scatter", count: 7, sizeMin: 0.1, sizeMax: 0.24, seed: 11 } }),
      shape({ name: "Colina lejana", shape: "circle", aspect: 1.7, fill: { kind: "solid", color: h[0] }, placement: { x: 0.22, y: 1.02, size: 1.15 } }),
      shape({ name: "Colina media", shape: "circle", aspect: 1.9, fill: { kind: "solid", color: h[1] }, placement: { x: 0.82, y: 1.08, size: 1.35 } }),
      shape({ name: "Colina cercana", shape: "circle", aspect: 2.3, fill: { kind: "solid", color: h[2] }, placement: { x: 0.45, y: 1.22, size: 1.7 } }),
      texture({ name: "Grano", intensity: 0.35 }),
    ],
  };
}

const stars = (count = 120) =>
  shape({ name: "Estrellas", shape: "circle", fill: { kind: "solid", color: "#ffffff" }, anim: anim("twinkle", { speed: 2, amount: 0.8 }), placement: { mode: "scatter", count, sizeMin: 0.002, sizeMax: 0.007 } });

export const TEMPLATES: Template[] = [
  {
    id: "aurora",
    name: "Aurora",
    tag: "Degradado",
    palette: ["#0b1026", "#2de2e6", "#7b2ff7", "#f72585", "#b8f2e6"],
    build: (p) => ({
      background: {
        kind: "mesh",
        base: p[0],
        points: [
          { x: 0.15, y: 0.2, color: p[2], radius: 0.6 },
          { x: 0.85, y: 0.3, color: p[3], radius: 0.5 },
          { x: 0.5, y: 0.95, color: p[1], radius: 0.55 },
        ],
      },
      layers: [
        shape({ name: "Blob luz", shape: "blob", fill: lin(120, p[1], p[4]), blur: 8, opacity: 0.8, blend: "screen", placement: { x: 0.35, y: 0.55, size: 0.7 } }),
        shape({ name: "Blob rosa", shape: "blob", fill: lin(200, p[3], p[2]), blur: 10, opacity: 0.7, blend: "screen", placement: { x: 0.75, y: 0.35, size: 0.6 } }),
        texture({ name: "Grano", intensity: 0.55, scale: 1.2 }),
      ],
    }),
  },
  {
    id: "memphis",
    name: "Memphis",
    tag: "Formas",
    palette: ["#fffffc", "#ffcf56", "#ff5e5b", "#00cecb", "#2d2a32"],
    build: (p) => ({
      background: { kind: "solid", color: p[0] },
      layers: [
        pattern({ name: "Puntitos", pattern: "dots", color: p[4], opacity: 0.18, size: 0.035, thickness: 0.18 }),
        shape({ name: "Triángulos", shape: "triangle", colorMode: "palette", palette: [p[1], p[2], p[3]], placement: { mode: "scatter", count: 14, sizeMin: 0.05, sizeMax: 0.1, randomRotation: 180 } }),
        shape({ name: "Garabatos", shape: "squiggle", aspect: 2.4, inner: 0.35, points: 6, colorMode: "palette", palette: [p[4], p[2]], placement: { mode: "scatter", count: 10, sizeMin: 0.1, sizeMax: 0.16, randomRotation: 180 } }),
        shape({ name: "Círculos", shape: "ring", inner: 0.35, colorMode: "palette", palette: [p[3], p[1], p[4]], placement: { mode: "scatter", count: 12, sizeMin: 0.04, sizeMax: 0.08 } }),
        shape({ name: "Cruces", shape: "plus", inner: 0.3, colorMode: "palette", palette: [p[2], p[4]], placement: { mode: "scatter", count: 10, sizeMin: 0.03, sizeMax: 0.05, randomRotation: 45 } }),
      ],
    }),
  },
  {
    id: "zoo",
    name: "Zoo pastel",
    tag: "Animales",
    palette: ["#ffd6e0", "#fff4b8", "#a0e7e5", "#b4a7f5", "#c1fba4"],
    build: (p) => ({
      background: lin(160, p[0], p[1]),
      layers: [
        pattern({ name: "Cuadrícula", pattern: "checker", color: "#ffffff", opacity: 0.25, size: 0.12 }),
        emoji({ name: "Animalitos", chars: ["🦊", "🐼", "🐸", "🐙", "🦄", "🐧", "🐨", "🐰"], placement: { mode: "grid", spacing: 0.24, size: 0.12, stagger: true, randomRotation: 12 }, shadow: { enabled: true, color: "#00000033", blur: 1.2, x: 0, y: 0.5 } }),
      ],
    }),
  },
  {
    id: "night",
    name: "Noche estrellada",
    tag: "Espacio",
    palette: ["#05061a", "#1b1b4b", "#6c5ce7", "#ffeaa7", "#ffffff"],
    build: (p) => ({
      background: { kind: "radial", cx: 0.5, cy: 1, radius: 1.1, stops: [{ color: p[2], pos: 0 }, { color: p[1], pos: 0.45 }, { color: p[0], pos: 1 }] },
      layers: [
        texture({ name: "Polvo estelar", texture: "speckle", color: p[4], intensity: 0.35, blend: "screen", opacity: 0.9 }),
        icon({ name: "Estrellas", icons: ["Sparkle", "Star"], colors: [p[3], p[4]], filled: true, strokeWidth: 1, placement: { mode: "scatter", count: 45, sizeMin: 0.012, sizeMax: 0.035, randomRotation: 30 } }),
        shape({ name: "Luna", shape: "circle", fill: lin(200, "#fffbe6", p[3]), shadow: { enabled: true, color: p[3], blur: 6, x: 0, y: 0 }, placement: { x: 0.75, y: 0.25, size: 0.16 } }),
        texture({ name: "Grano", intensity: 0.4 }),
      ],
    }),
  },
  {
    id: "sunset",
    name: "Sunset retro",
    tag: "Retro",
    palette: ["#1d1145", "#ff6b6b", "#feca57", "#ff9ff3", "#48dbfb"],
    build: (p) => ({
      background: {
        kind: "linear",
        angle: 180,
        stops: [
          { color: p[0], pos: 0 },
          { color: p[3], pos: 0.45 },
          { color: p[1], pos: 0.69 },
          { color: p[0], pos: 0.7 },
          { color: "#000000", pos: 1 },
        ],
      },
      layers: [
        shape({ name: "Sol", shape: "circle", fill: lin(180, p[2], p[1]), shadow: { enabled: true, color: p[2], blur: 5, x: 0, y: 0 }, placement: { x: 0.5, y: 0.42, size: 0.45 } }),
        pattern({ name: "Rayos", pattern: "rays", color: p[2], opacity: 0.08, size: 0.05, thickness: 0.5, blend: "screen" }),
        texture({ name: "Scanlines", texture: "scanlines", color: "#000000", intensity: 0.25, blend: "source-over", opacity: 1 }),
        texture({ name: "Grano", intensity: 0.4 }),
      ],
    }),
  },
  {
    id: "topo",
    name: "Topográfico",
    tag: "Patrón",
    palette: ["#0b2b26", "#12664f", "#3ecf8e", "#9ef0c8", "#e8fff5"],
    build: (p) => ({
      background: lin(145, p[0], p[1]),
      layers: [
        pattern({ name: "Curvas de nivel", pattern: "topography", color: p[3], opacity: 0.5, size: 0.12, thickness: 0.35 }),
        texture({ name: "Viñeta", texture: "vignette", color: "#000000", intensity: 0.6, blend: "source-over", opacity: 1 }),
        texture({ name: "Grano", intensity: 0.5 }),
      ],
    }),
  },
  {
    id: "quote",
    name: "Frase minimal",
    tag: "Texto",
    palette: ["#f4eee0", "#e0c9a6", "#c08552", "#895737", "#2b1a12"],
    build: (p) => ({
      background: lin(180, p[0], p[1]),
      layers: [
        shape({ name: "Arco", shape: "arch", aspect: 0.72, fill: lin(180, p[2], p[3]), placement: { x: 0.5, y: 0.62, size: 0.42 } }),
        text({ name: "Frase", text: "stay\ncurious", font: "serif", weight: 400, size: 0.13, color: p[4], y: 0.5, letterSpacing: -0.01, lineHeight: 0.95 }),
        texture({ name: "Papel", texture: "paper", intensity: 0.45, blend: "multiply", opacity: 0.35 }),
      ],
    }),
  },
  {
    id: "tech",
    name: "Dev mode",
    tag: "Íconos",
    palette: ["#0d1117", "#161b22", "#58a6ff", "#3fb950", "#d2a8ff"],
    build: (p) => ({
      background: { kind: "radial", cx: 0.5, cy: 0.5, radius: 0.8, stops: [{ color: p[1], pos: 0 }, { color: p[0], pos: 1 }] },
      layers: [
        icon({ name: "Stack", icons: ["Code", "Terminal", "Cpu", "Braces", "GitBranch", "Database", "Bot", "Zap"], colors: [p[2], p[3], p[4]], strokeWidth: 1.6, opacity: 0.8, placement: { mode: "grid", spacing: 0.12, size: 0.05, stagger: true } }),
        text({ name: "Prompt", text: "> build something_", font: "mono", weight: 700, size: 0.06, color: "#e6edf3", shadow: { enabled: true, color: p[2], blur: 3, x: 0, y: 0 } }),
        texture({ name: "Viñeta", texture: "vignette", color: "#000000", intensity: 0.8, blend: "source-over", opacity: 1 }),
      ],
    }),
  },
  {
    id: "fruits",
    name: "Tutti frutti",
    tag: "Emojis",
    palette: ["#ff8fa3", "#ffd166", "#06d6a0", "#118ab2", "#ff4d6d"],
    build: (p) => ({
      background: lin(135, p[0], p[4]),
      layers: [
        pattern({ name: "Diamantes", pattern: "diamonds", color: "#ffffff", opacity: 0.15, size: 0.08, thickness: 0.4 }),
        emoji({ name: "Frutas", chars: ["🍓", "🍒", "🍑", "🍉", "🍋", "🍍", "🥝", "🫐"], placement: { mode: "scatter", count: 38, sizeMin: 0.06, sizeMax: 0.13, randomRotation: 40 }, shadow: { enabled: true, color: "#00000040", blur: 1.5, x: 0, y: 0.8 } }),
      ],
    }),
  },
  {
    id: "boho",
    name: "Boho",
    tag: "Formas",
    palette: ["#f1e4d3", "#d9a47e", "#b5654a", "#6b7f5e", "#3d2b24"],
    build: (p) => ({
      background: { kind: "solid", color: p[0] },
      layers: [
        shape({ name: "Sol", shape: "circle", fill: { kind: "solid", color: p[1] }, placement: { x: 0.68, y: 0.35, size: 0.32 } }),
        shape({ name: "Arco grande", shape: "arch", aspect: 0.8, fill: { kind: "solid", color: p[2] }, placement: { x: 0.35, y: 0.75, size: 0.45 } }),
        shape({ name: "Arco interior", shape: "arch", aspect: 0.8, fill: { kind: "solid", color: p[0] }, placement: { x: 0.35, y: 0.82, size: 0.28 } }),
        shape({ name: "Hoja", shape: "blob", fill: { kind: "solid", color: p[3] }, placement: { x: 0.78, y: 0.8, size: 0.3 } }),
        pattern({ name: "Puntos", pattern: "dots", color: p[4], opacity: 0.25, size: 0.04, thickness: 0.12 }),
        texture({ name: "Papel", texture: "paper", intensity: 0.5, blend: "multiply", opacity: 0.4 }),
      ],
    }),
  },
  {
    id: "waves",
    name: "Olas",
    tag: "Patrón",
    palette: ["#03045e", "#0077b6", "#00b4d8", "#90e0ef", "#caf0f8"],
    build: (p) => ({
      background: lin(200, p[2], p[0]),
      layers: [
        pattern({ name: "Ondas", pattern: "waves", color: p[4], opacity: 0.3, size: 0.06, thickness: 0.3, rotation: -8 }),
        texture({ name: "Halftone", texture: "halftone", color: p[3], intensity: 0.3, blend: "screen", opacity: 0.5, scale: 1.5 }),
        emoji({ name: "Bichos marinos", chars: ["🐠", "🐡", "🐙", "🦀", "🐢", "🐳"], placement: { mode: "scatter", count: 14, sizeMin: 0.07, sizeMax: 0.13, randomRotation: 15 }, shadow: { enabled: true, color: "#001233", blur: 1.5, x: 0, y: 0.6 } }),
      ],
    }),
  },
  {
    id: "holo",
    name: "Holográfico",
    tag: "Degradado",
    palette: ["#ff9ff3", "#feca57", "#48dbfb", "#1dd1a1", "#5f27cd"],
    build: (p) => ({
      background: { kind: "conic", angle: 0, cx: 0.4, cy: 0.6, stops: p.map((color, i) => ({ color, pos: i / p.length })) },
      layers: [
        shape({ name: "Suavizado", shape: "circle", fill: { kind: "solid", color: "#ffffff" }, blur: 12, opacity: 0.45, blend: "soft-light", placement: { size: 1.2 } }),
        text({ name: "Título", text: "HOLO", font: "bebas", weight: 400, size: 0.4, color: "#ffffff", letterSpacing: 0.05, blend: "overlay", opacity: 0.9 }),
        texture({ name: "Grano", intensity: 0.6, scale: 1 }),
      ],
    }),
  },
  {
    id: "cats",
    name: "Gatitos",
    tag: "Animales",
    palette: ["#231942", "#5e548e", "#9f86c0", "#be95c4", "#e0b1cb"],
    build: (p) => ({
      background: lin(160, p[1], p[0]),
      layers: [
        icon({ name: "Gatos y huellas", icons: ["Cat", "PawPrint", "Fish", "PawPrint"], colors: [p[4], p[3]], strokeWidth: 1.6, placement: { mode: "grid", spacing: 0.13, size: 0.06, stagger: true, randomRotation: 15 } }),
        texture({ name: "Grano", intensity: 0.4 }),
      ],
    }),
  },
  {
    id: "flowers",
    name: "Flores 70s",
    tag: "Formas",
    palette: ["#fff4d6", "#ff8c42", "#ff3c38", "#a23e48", "#6c8ead"],
    build: (p) => ({
      background: { kind: "solid", color: p[0] },
      layers: [
        shape({ name: "Flores", shape: "flower", points: 6, colorMode: "palette", palette: [p[1], p[2], p[3], p[4]], placement: { mode: "scatter", count: 22, sizeMin: 0.1, sizeMax: 0.26, randomRotation: 60 } }),
        texture({ name: "Grano", intensity: 0.45, blend: "multiply", opacity: 0.25 }),
      ],
    }),
  },
  {
    id: "neon",
    name: "Neón",
    tag: "Retro",
    palette: ["#0d0221", "#ff00c8", "#00f0ff", "#faff00", "#7a04eb"],
    build: (p) => ({
      background: lin(180, p[0], "#1a0536"),
      layers: [
        shape({ name: "Anillo", shape: "ring", inner: 0.08, fill: lin(90, p[1], p[2]), shadow: { enabled: true, color: p[1], blur: 4, x: 0, y: 0 }, placement: { size: 0.6 } }),
        shape({ name: "Triángulo", shape: "triangle", fill: { kind: "solid", color: "#00000000" }, stroke: { enabled: true, color: p[2], width: 2.5 }, shadow: { enabled: true, color: p[2], blur: 3, x: 0, y: 0 }, placement: { size: 0.3, y: 0.52 } }),
        text({ name: "Texto neón", text: "night drive", font: "pacifico", weight: 400, size: 0.09, color: "#fff0fb", y: 0.84, shadow: { enabled: true, color: p[1], blur: 2.5, x: 0, y: 0 } }),
        texture({ name: "Scanlines", texture: "scanlines", color: "#000000", intensity: 0.3, blend: "source-over", opacity: 1 }),
      ],
    }),
  },

  /* ---------- Animated ---------- */
  {
    id: "bubbles",
    name: "Burbujas",
    tag: "Animado",
    palette: ["#03045e", "#0077b6", "#00b4d8", "#90e0ef", "#caf0f8"],
    build: (p) => ({
      loop: 10,
      backgroundAnim: { kind: "shift", speed: 1, amount: 0.6 },
      background: { kind: "mesh", base: p[0], points: [{ x: 0.2, y: 0.9, color: p[1], radius: 0.7 }, { x: 0.8, y: 0.2, color: p[2], radius: 0.5 }, { x: 0.5, y: 0.5, color: p[0], radius: 0.4 }] },
      layers: [
        shape({ name: "Brillitos", shape: "circle", fill: { kind: "solid", color: p[4] }, opacity: 0.35, blur: 0.3, anim: anim("drift", { speed: 2, amount: 0.3 }), placement: { mode: "scatter", count: 40, sizeMin: 0.004, sizeMax: 0.014 } }),
        shape({ name: "Burbujas", shape: "ring", inner: 0.09, fill: { kind: "solid", color: p[4] }, opacity: 0.55, anim: anim("drift", { amount: 0.6 }), placement: { mode: "scatter", count: 40, sizeMin: 0.015, sizeMax: 0.09 } }),
        texture({ name: "Grano vivo", intensity: 0.35, anim: anim("flicker") }),
      ],
    }),
  },
  {
    id: "snow",
    name: "Nevada",
    tag: "Animado",
    palette: ["#0b1026", "#1e2a5a", "#3b4c8c", "#c9d6ff", "#ffffff"],
    build: (p) => ({
      loop: 12,
      background: lin(180, p[0], p[1], p[2]),
      layers: [
        shape({ name: "Luna", shape: "circle", fill: lin(200, p[4], p[3]), shadow: glow(p[3], 5), placement: { x: 0.78, y: 0.22, size: 0.12 } }),
        shape({ name: "Nieve lejana", shape: "circle", fill: { kind: "solid", color: p[4] }, opacity: 0.55, blur: 0.25, anim: anim("drift", { angle: 90, speed: 1, amount: 0.3 }), placement: { mode: "scatter", count: 160, sizeMin: 0.003, sizeMax: 0.009 } }),
        icon({ name: "Copos", icons: ["Snowflake"], colors: [p[4], p[3]], strokeWidth: 1.4, opacity: 0.9, anim: anim("drift", { angle: 90, amount: 0.5 }), placement: { mode: "scatter", count: 45, sizeMin: 0.014, sizeMax: 0.045, randomRotation: 180 } }),
        texture({ name: "Viñeta", texture: "vignette", intensity: 0.55, blend: "source-over", opacity: 1 }),
      ],
    }),
  },
  {
    id: "lava",
    name: "Lava lamp",
    tag: "Animado",
    palette: ["#12002b", "#ff006e", "#fb5607", "#ffbe0b", "#8338ec"],
    build: (p) => ({
      loop: 12,
      background: { kind: "solid", color: p[0] },
      layers: [
        shape({ name: "Gota violeta", shape: "blob", fill: lin(160, p[4], p[1]), blur: 5, blend: "screen", anim: anim("float", { amount: 1 }), placement: { x: 0.28, y: 0.4, size: 0.55 } }),
        shape({ name: "Gota naranja", shape: "blob", fill: lin(20, p[2], p[3]), blur: 6, blend: "screen", anim: anim("float", { amount: 1, speed: 2 }), placement: { x: 0.72, y: 0.6, size: 0.5 } }),
        shape({ name: "Gota rosa", shape: "blob", fill: lin(90, p[1], p[2]), blur: 7, blend: "screen", opacity: 0.8, anim: anim("pulse", { amount: 0.8 }), placement: { x: 0.5, y: 0.2, size: 0.35 } }),
        texture({ name: "Grano vivo", intensity: 0.45, anim: anim("flicker") }),
      ],
    }),
  },
  {
    id: "fruit-rain",
    name: "Lluvia de frutas",
    tag: "Animado",
    palette: ["#ffd6e0", "#fff4b8", "#a0e7e5", "#b4a7f5", "#c1fba4"],
    build: (p) => ({
      loop: 8,
      background: lin(160, p[0], p[1]),
      layers: [
        pattern({ name: "Puntos", pattern: "dots", color: "#ffffff", opacity: 0.5, size: 0.05, thickness: 0.15, anim: anim("drift") }),
        emoji({ name: "Frutas", chars: ["🍓", "🍒", "🍑", "🍋", "🍉", "🫐", "🥝"], shadow: { enabled: true, color: "#00000030", blur: 1.2, x: 0, y: 0.5 }, anim: anim("drift", { angle: 90, amount: 0.5 }), placement: { mode: "scatter", count: 30, sizeMin: 0.05, sizeMax: 0.11, randomRotation: 40 } }),
      ],
    }),
  },
  {
    id: "warp",
    name: "Hiperespacio",
    tag: "Animado",
    palette: ["#000005", "#0b0f3a", "#7b2ff7", "#2de2e6", "#ffffff"],
    build: (p) => ({
      loop: 6,
      background: { kind: "radial", cx: 0.5, cy: 0.5, radius: 0.8, stops: [{ color: p[1], pos: 0 }, { color: p[0], pos: 1 }] },
      layers: [
        pattern({ name: "Túnel", pattern: "rings", color: p[2], opacity: 0.22, size: 0.08, thickness: 0.12, blend: "screen", anim: anim("drift", { speed: 2 }) }),
        stars(220),
        icon({ name: "Destellos", icons: ["Sparkle"], colors: [p[3], p[4]], filled: true, strokeWidth: 1, shadow: glow(p[3], 1.2), anim: anim("twinkle", { amount: 1 }), placement: { mode: "scatter", count: 24, sizeMin: 0.01, sizeMax: 0.03 } }),
        texture({ name: "Nebulosa", texture: "glow", color: p[2], intensity: 0.5, scale: 2.5, blend: "screen", opacity: 0.8, anim: anim("flow", { amount: 1 }) }),
      ],
    }),
  },
  {
    id: "live-sea",
    name: "Mar vivo",
    tag: "Animado",
    palette: ["#03045e", "#0077b6", "#00b4d8", "#90e0ef", "#caf0f8"],
    build: (p) => ({
      loop: 8,
      background: lin(200, p[2], p[0]),
      layers: [
        pattern({ name: "Ondas", pattern: "waves", color: p[4], opacity: 0.3, size: 0.06, thickness: 0.3, anim: anim("drift") }),
        texture({ name: "Halftone", texture: "halftone", color: p[3], intensity: 0.3, blend: "screen", opacity: 0.5, scale: 1.5, anim: anim("flow", { amount: 0.8 }) }),
        emoji({ name: "Peces", chars: ["🐠", "🐡", "🐟", "🐢", "🐙"], shadow: glow("#001233", 1.2), anim: anim("drift", { angle: 180, amount: 0.5 }), placement: { mode: "scatter", count: 12, sizeMin: 0.06, sizeMax: 0.12 } }),
      ],
    }),
  },
  {
    id: "live-topo",
    name: "Terreno vivo",
    tag: "Animado",
    palette: ["#0b2b26", "#12664f", "#3ecf8e", "#9ef0c8", "#e8fff5"],
    build: (p) => ({
      loop: 12,
      background: lin(145, p[0], p[1]),
      layers: [
        pattern({ name: "Curvas de nivel", pattern: "topography", color: p[3], opacity: 0.55, size: 0.12, thickness: 0.35, anim: anim("morph", { amount: 0.6 }) }),
        texture({ name: "Viñeta", texture: "vignette", color: "#000000", intensity: 0.6, blend: "source-over", opacity: 1 }),
        texture({ name: "Grano vivo", intensity: 0.45, anim: anim("flicker") }),
      ],
    }),
  },
  {
    id: "live-aurora",
    name: "Aurora viva",
    tag: "Animado",
    palette: ["#0b1026", "#2de2e6", "#7b2ff7", "#f72585", "#b8f2e6"],
    build: (p) => ({
      loop: 15,
      backgroundAnim: { kind: "shift", speed: 1, amount: 1 },
      background: { kind: "mesh", base: p[0], points: [{ x: 0.15, y: 0.2, color: p[2], radius: 0.6 }, { x: 0.85, y: 0.3, color: p[3], radius: 0.5 }, { x: 0.5, y: 0.95, color: p[1], radius: 0.55 }] },
      layers: [
        shape({ name: "Velo", shape: "blob", fill: lin(120, p[1], p[4]), blur: 9, opacity: 0.7, blend: "screen", anim: anim("float", { amount: 0.8 }), placement: { x: 0.4, y: 0.55, size: 0.7 } }),
        stars(80),
        texture({ name: "Grano vivo", intensity: 0.5, anim: anim("flicker") }),
      ],
    }),
  },
  {
    id: "party",
    name: "Fiesta",
    tag: "Animado",
    palette: ["#1a0536", "#ff4d6d", "#ffd166", "#06d6a0", "#118ab2"],
    build: (p) => ({
      loop: 8,
      background: { kind: "radial", cx: 0.5, cy: 0.4, radius: 0.9, stops: [{ color: "#3a0d6b", pos: 0 }, { color: p[0], pos: 1 }] },
      layers: [
        shape({ name: "Confeti", shape: "rect", aspect: 2.5, corner: 0.5, colorMode: "palette", palette: [p[1], p[2], p[3], p[4], "#ffffff"], anim: anim("drift", { angle: 90, amount: 0.6 }), placement: { mode: "scatter", count: 150, sizeMin: 0.012, sizeMax: 0.03, randomRotation: 180 } }),
        text({ name: "Título", text: "¡hoy se celebra!", font: "pacifico", weight: 400, size: 0.1, color: "#ffffff", shadow: glow(p[1], 2.5), anim: anim("pulse", { amount: 0.25 }) }),
      ],
    }),
  },

  /* ---------- Day / night ---------- */
  {
    id: "hills",
    name: "Colinas (4 momentos)",
    tag: "Día/Noche",
    palette: ["#6ec6ff", "#ffd23f", "#7bd389", "#3aa35b", "#2d6a4f"],
    build: (p) =>
      dayNight(
        "time",
        [
          sceneOf("Día", 9, "light", "day", hills(lin(180, p[0], "#d8f1ff"), shape({ name: "Sol", shape: "circle", fill: { kind: "solid", color: p[1] }, shadow: glow(p[1], 5), placement: { x: 0.75, y: 0.22, size: 0.14 } }), [p[2], p[3], p[4]], "#ffffff")),
          sceneOf("Amanecer", 6, "light", "dawn", hills(lin(180, "#ffb4a2", "#ffe5d9"), shape({ name: "Sol", shape: "circle", fill: { kind: "solid", color: "#ffcf70" }, shadow: glow("#ffcf70", 5), placement: { x: 0.3, y: 0.62, size: 0.14 } }), ["#9cc5a1", "#6a9c78", "#4a7c59"], "#fff0f3")),
          sceneOf("Atardecer", 18, "light", "sunset", hills(lin(180, "#3a1c71", "#d76d77", "#ffaf7b"), shape({ name: "Sol", shape: "circle", fill: { kind: "solid", color: "#ff7b54" }, shadow: glow("#ff7b54", 6), placement: { x: 0.62, y: 0.6, size: 0.18 } }), ["#6d597a", "#4a3f5c", "#2e2440"], "#ffd6c9")),
          sceneOf("Noche", 20.5, "dark", "night", hills(lin(180, "#050a24", "#1b2a5c"), shape({ name: "Luna", shape: "circle", fill: { kind: "solid", color: "#f4f1de" }, shadow: glow("#f4f1de", 4), placement: { x: 0.75, y: 0.2, size: 0.09 } }), ["#1d3b4a", "#132a38", "#0b1a26"], "#2b3a67", [stars()])),
        ],
        { loop: 20 },
      ),
  },
  {
    id: "ocean-dn",
    name: "Océano claro/oscuro",
    tag: "Día/Noche",
    palette: ["#8ee3f5", "#1fa2d6", "#ffe066", "#ffffff", "#0b3d6b"],
    build: (p) =>
      dayNight(
        "appearance",
        [
          sceneOf("Día", 9, "light", "day", {
            background: lin(180, p[0], p[1]),
            layers: [
              shape({ name: "Sol", shape: "circle", fill: { kind: "solid", color: p[2] }, shadow: glow(p[2], 5), placement: { x: 0.8, y: 0.18, size: 0.13 } }),
              pattern({ name: "Olas", pattern: "waves", color: p[3], opacity: 0.35, size: 0.07, thickness: 0.3, anim: anim("drift") }),
              emoji({ name: "Peces", chars: ["🐠", "🐡", "🐬", "🐟"], shadow: { enabled: true, color: "#00335520", blur: 1, x: 0, y: 0.5 }, anim: anim("drift", { angle: 180, amount: 0.5 }), placement: { mode: "scatter", count: 12, sizeMin: 0.05, sizeMax: 0.1 } }),
            ],
          }),
          sceneOf("Noche", 20, "dark", "night", {
            background: lin(180, "#020b2d", p[4]),
            layers: [
              stars(90),
              shape({ name: "Luna", shape: "circle", fill: { kind: "solid", color: "#f4f1de" }, shadow: glow("#f4f1de", 4), placement: { x: 0.8, y: 0.18, size: 0.09 } }),
              pattern({ name: "Olas", pattern: "waves", color: "#9ad1ff", opacity: 0.18, size: 0.07, thickness: 0.3, anim: anim("drift") }),
              emoji({ name: "Medusas", chars: ["🪼", "🐙", "🦑"], shadow: glow("#7fd8ff", 1.5), anim: anim("drift", { angle: 270, amount: 0.5 }), placement: { mode: "scatter", count: 10, sizeMin: 0.05, sizeMax: 0.11 } }),
            ],
          }),
        ],
        { loop: 10 },
      ),
  },
  {
    id: "minimal-dn",
    name: "Minimal claro/oscuro",
    tag: "Día/Noche",
    palette: ["#f4efe6", "#e76f51", "#2b2b2b", "#141414", "#f4a261"],
    build: (p) =>
      dayNight("appearance", [
        sceneOf("Claro", 9, "light", "day", {
          background: { kind: "solid", color: p[0] },
          layers: [
            shape({ name: "Sol", shape: "circle", fill: { kind: "solid", color: p[1] }, placement: { x: 0.5, y: 0.36, size: 0.16 } }),
            text({ name: "Frase", text: "respira.", font: "serif", weight: 400, size: 0.11, color: p[2], y: 0.62 }),
            texture({ name: "Papel", texture: "paper", intensity: 0.4, blend: "multiply", opacity: 0.3 }),
          ],
        }),
        sceneOf("Oscuro", 20, "dark", "night", {
          background: { kind: "solid", color: p[3] },
          layers: [
            shape({ name: "Luna", shape: "circle", fill: { kind: "solid", color: p[4] }, shadow: glow(p[4], 4), placement: { x: 0.5, y: 0.36, size: 0.16 } }),
            text({ name: "Frase", text: "descansa.", font: "serif", weight: 400, size: 0.11, color: p[0], y: 0.62, shadow: noShadow }),
            texture({ name: "Grano", intensity: 0.4 }),
          ],
        }),
      ]),
  },
];

export function buildTemplate(t: Template, palette = t.palette): Design {
  return t.build(palette);
}

export const isDayNight = (d: Design) => (d.scenes?.length ?? 0) > 1;
export const isAnimatedDesign = (d: Design) =>
  (d.backgroundAnim && d.backgroundAnim.kind !== "none") || [...d.layers, ...(d.scenes ?? []).flatMap((s) => s.layers)].some((l) => l.anim && l.anim.kind !== "none");

/** Recolors a design; day/night designs recolor the day scene and re-derive the others so they stay coherent. */
export function recolorDesign(d: Design, palette: string[]): Design {
  if (!isDayNight(d)) return recolor(d, palette);
  const day = recolor({ background: d.scenes![0].background, layers: d.scenes![0].layers }, palette);
  const { width: _w, height: _h, ...rest } = resyncScenes({ width: 1, height: 1, ...d, activeScene: 0 }, day);
  void _w;
  void _h;
  return rest;
}

/** The daytime part of a design (drops scenes). */
export function dayOf(d: Design): Design {
  const { scenes, activeScene: _a, dynamicMode: _m, ...rest } = d;
  void _a;
  void _m;
  return scenes?.length ? { ...rest, background: scenes[0].background, layers: scenes[0].layers } : rest;
}

/* ---------- Recoloring & surprises ---------- */

const HEX = /^#[0-9a-f]{6}$/i;

/** Maps every color in a design to a new palette, keeping the light/dark structure. */
export function recolor<T extends object>(design: T, palette: string[]): T {
  const found = new Set<string>();
  const walk = (v: unknown) => {
    if (typeof v === "string" && HEX.test(v)) found.add(v.toLowerCase());
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(design);
  const src = [...found].sort((a, b) => luminance(a) - luminance(b));
  const dst = [...palette].sort((a, b) => luminance(a) - luminance(b));
  const map = new Map<string, string>();
  src.forEach((c, i) => {
    const t = src.length === 1 ? 0.5 : i / (src.length - 1);
    map.set(c, dst[Math.round(t * (dst.length - 1))]);
  });
  const replace = (v: unknown): unknown => {
    if (typeof v === "string" && HEX.test(v)) return map.get(v.toLowerCase()) ?? v;
    if (Array.isArray(v)) return v.map(replace);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, replace(x)]));
    return v;
  };
  return replace(design) as T;
}

/** New random layouts for every seeded layer. */
export function reseed(layers: Layer[]): Layer[] {
  return layers.map((l) => {
    if ("placement" in l) return { ...l, placement: { ...l.placement, seed: randomSeed() } } as Layer;
    if ("seed" in l) return { ...l, seed: randomSeed() } as Layer;
    return l;
  });
}

/** A random single-scene design (keeps animation). Day/night is layered on top by the caller when needed. */
export function surprise(): Design {
  const rng = mulberry32(randomSeed());
  const t = pick(rng, TEMPLATES);
  const pal = rng() < 0.35 ? t.palette : shuffle(rng, pick(rng, PALETTES).colors);
  const d = dayOf(buildTemplate(t, t.palette));
  const colored = pal === t.palette ? d : recolor(d, pal);
  return { backgroundAnim: undefined, loop: undefined, ...colored, layers: reseed(colored.layers) };
}

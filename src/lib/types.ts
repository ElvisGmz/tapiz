export type BlendMode =
  | "source-over"
  | "multiply"
  | "screen"
  | "overlay"
  | "soft-light"
  | "hard-light"
  | "color-dodge"
  | "color-burn"
  | "lighten"
  | "darken"
  | "difference"
  | "exclusion"
  | "hue"
  | "saturation"
  | "color"
  | "luminosity";

export interface GradientStop {
  color: string;
  pos: number; // 0..1
}

export interface MeshPoint {
  x: number; // 0..1
  y: number; // 0..1
  color: string;
  radius: number; // relative to the largest side
}

export type Fill =
  | { kind: "solid"; color: string }
  | { kind: "linear"; stops: GradientStop[]; angle: number }
  | { kind: "radial"; stops: GradientStop[]; cx: number; cy: number; radius: number }
  | { kind: "conic"; stops: GradientStop[]; angle: number; cx: number; cy: number }
  | { kind: "mesh"; base: string; points: MeshPoint[] };

export type FillKind = Fill["kind"];

export type PlacementMode = "single" | "scatter" | "grid";

export interface Placement {
  mode: PlacementMode;
  // single
  x: number; // 0..1
  y: number; // 0..1
  size: number; // relative to the shorter side (single & grid)
  rotation: number; // deg
  // scatter
  count: number;
  sizeMin: number;
  sizeMax: number;
  // grid
  spacing: number; // cell size relative to shorter side
  stagger: boolean;
  jitter: number; // 0..1 position jitter
  // scatter & grid
  randomRotation: number; // max deg of random rotation
  seed: number;
}

export interface Shadow {
  enabled: boolean;
  color: string;
  blur: number; // % of shorter side
  x: number; // % of shorter side
  y: number; // % of shorter side
}

export type AnimKind = "none" | "drift" | "float" | "sway" | "spin" | "pulse" | "twinkle" | "flow" | "flicker" | "morph";

/** Every animation is periodic over the loop, so exported videos loop seamlessly. */
export interface Animation {
  kind: AnimKind;
  speed: number; // whole cycles per loop (1..4)
  amount: number; // 0..1 intensity
  angle: number; // drift direction in degrees (0 = right, 90 = down)
}

interface LayerBase {
  id: string;
  name: string;
  visible: boolean;
  opacity: number; // 0..1
  blend: BlendMode;
  blur: number; // % of shorter side
  shadow: Shadow;
  anim?: Animation;
}

export type ShapeKind =
  | "circle"
  | "rect"
  | "triangle"
  | "star"
  | "polygon"
  | "blob"
  | "ring"
  | "heart"
  | "arch"
  | "plus"
  | "squiggle"
  | "flower";

export interface ShapeLayer extends LayerBase {
  type: "shape";
  shape: ShapeKind;
  fill: Fill;
  colorMode: "fill" | "palette";
  palette: string[];
  aspect: number; // width / height
  corner: number; // 0..0.5, rect roundness
  points: number; // star / polygon / flower
  inner: number; // star inner ratio, ring thickness
  stroke: { enabled: boolean; color: string; width: number };
  placement: Placement;
}

export type EmojiStyle = "twemoji" | "openmoji" | "system";

export interface EmojiLayer extends LayerBase {
  type: "emoji";
  chars: string[];
  style: EmojiStyle;
  placement: Placement;
}

export interface IconLayer extends LayerBase {
  type: "icon";
  icons: string[]; // lucide PascalCase names
  colors: string[];
  strokeWidth: number; // lucide units (24 grid)
  filled: boolean;
  placement: Placement;
}

export type PatternKind =
  | "dots"
  | "grid"
  | "lines"
  | "diagonal"
  | "checker"
  | "waves"
  | "zigzag"
  | "triangles"
  | "hexagons"
  | "scales"
  | "plus"
  | "crosshatch"
  | "diamonds"
  | "rings"
  | "rays"
  | "topography";

export interface PatternLayer extends LayerBase {
  type: "pattern";
  pattern: PatternKind;
  color: string;
  size: number; // cell size relative to shorter side
  thickness: number; // 0..1 relative to the cell
  rotation: number;
  seed: number;
}

export type TextureKind =
  | "grain"
  | "color-noise"
  | "paper"
  | "halftone"
  | "scanlines"
  | "vignette"
  | "canvas"
  | "speckle"
  | "glow";

export interface TextureLayer extends LayerBase {
  type: "texture";
  texture: TextureKind;
  intensity: number; // 0..1
  scale: number; // 0.5..8
  color: string;
  seed: number;
}

export type FontKey =
  | "inter"
  | "grotesk"
  | "playfair"
  | "bebas"
  | "pacifico"
  | "serif"
  | "mono"
  | "caveat"
  | "righteous";

export interface TextLayer extends LayerBase {
  type: "text";
  text: string;
  font: FontKey;
  weight: number;
  size: number; // relative to shorter side
  color: string;
  x: number;
  y: number;
  align: CanvasTextAlign;
  letterSpacing: number; // em
  lineHeight: number;
  rotation: number;
  uppercase: boolean;
}

export type PhotoFrame = "none" | "rounded" | "circle" | "polaroid" | "arch" | "blob";

export interface ImageLayer extends LayerBase {
  type: "image";
  images: string[]; // photo ids (IndexedDB)
  mode: "fill" | "items"; // fill = covers the whole canvas
  fit: "cover" | "contain"; // fill mode
  zoom: number; // fill mode, 1 = fit
  focusX: number; // fill mode, 0..1
  focusY: number;
  frame: PhotoFrame; // items mode
  frameColor: string;
  brightness: number; // 1 = normal
  contrast: number;
  saturation: number;
  grayscale: number; // 0..1
  hue: number; // deg
  placement: Placement;
}

export type Layer = ShapeLayer | EmojiLayer | IconLayer | PatternLayer | TextureLayer | TextLayer | ImageLayer;
export type LayerType = Layer["type"];

export interface WallpaperDoc extends DynamicInfo, MotionInfo {
  width: number;
  height: number;
  background: Fill;
  layers: Layer[];
}

/** One variant of a dynamic wallpaper (e.g. day / sunset / night). */
export interface Scene {
  id: string;
  name: string;
  hour: number; // 0..24, when it starts showing (time mode)
  appearance: "light" | "dark";
  kind?: "day" | "night" | "sunset" | "dawn" | "copy"; // how it relates to the day scene (used to re-derive on "Sorpréndeme")
  background: Fill;
  layers: Layer[];
}

export type DynamicMode = "appearance" | "time";

/**
 * When `scenes` is set the wallpaper is dynamic. The active scene is edited
 * through the top-level `background`/`layers`; its copy inside `scenes` is
 * refreshed by `syncScenes` whenever scenes are read or switched.
 */
export interface DynamicInfo {
  scenes?: Scene[];
  activeScene?: number;
  dynamicMode?: DynamicMode;
}

export type BackgroundAnimKind = "none" | "shift" | "rotate" | "breathe";

export interface MotionInfo {
  loop?: number; // seconds per loop
  backgroundAnim?: { kind: BackgroundAnimKind; speed: number; amount: number };
}

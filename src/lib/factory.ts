import { randomSeed, uid } from "./random";
import type {
  Animation,
  EmojiLayer,
  IconLayer,
  ImageLayer,
  Layer,
  LayerType,
  PatternLayer,
  Placement,
  ShapeLayer,
  TextLayer,
  TextureLayer,
} from "./types";

export const placement = (over: Partial<Placement> = {}): Placement => ({
  mode: "single",
  x: 0.5,
  y: 0.5,
  size: 0.4,
  rotation: 0,
  count: 40,
  sizeMin: 0.04,
  sizeMax: 0.12,
  spacing: 0.16,
  stagger: true,
  jitter: 0,
  randomRotation: 0,
  seed: randomSeed(),
  ...over,
});

const base = (name: string) => ({
  id: uid(),
  name,
  visible: true,
  opacity: 1,
  blend: "source-over" as const,
  blur: 0,
  shadow: { enabled: false, color: "#000000", blur: 2, x: 0, y: 0.6 },
});

type Over<T> = Partial<Omit<T, "placement">> & { placement?: Partial<Placement> };

export function shape(over: Over<ShapeLayer> = {}): ShapeLayer {
  const { placement: p, ...rest } = over;
  return {
    ...base("Forma"),
    type: "shape",
    shape: "circle",
    fill: { kind: "linear", angle: 135, stops: [{ color: "#ff6b6b", pos: 0 }, { color: "#feca57", pos: 1 }] },
    colorMode: "fill",
    palette: ["#ff6b6b", "#feca57", "#48dbfb", "#ff9ff3"],
    aspect: 1,
    corner: 0.2,
    points: 5,
    inner: 0.45,
    stroke: { enabled: false, color: "#ffffff", width: 3 },
    ...rest,
    placement: placement(p),
  };
}

export function emoji(over: Over<EmojiLayer> = {}): EmojiLayer {
  const { placement: p, ...rest } = over;
  return {
    ...base("Emojis"),
    type: "emoji",
    chars: ["✨"],
    style: "twemoji",
    ...rest,
    placement: placement({ mode: "scatter", count: 30, sizeMin: 0.05, sizeMax: 0.12, randomRotation: 25, ...p }),
  };
}

export function icon(over: Over<IconLayer> = {}): IconLayer {
  const { placement: p, ...rest } = over;
  return {
    ...base("Íconos"),
    type: "icon",
    icons: ["Star"],
    colors: ["#ffffff"],
    strokeWidth: 1.5,
    filled: false,
    ...rest,
    placement: placement({ mode: "grid", size: 0.06, spacing: 0.14, ...p }),
  };
}

export function pattern(over: Partial<PatternLayer> = {}): PatternLayer {
  return {
    ...base("Patrón"),
    opacity: 0.35,
    type: "pattern",
    pattern: "dots",
    color: "#ffffff",
    size: 0.05,
    thickness: 0.25,
    rotation: 0,
    seed: randomSeed(),
    ...over,
  };
}

export function texture(over: Partial<TextureLayer> = {}): TextureLayer {
  return {
    ...base("Textura"),
    type: "texture",
    texture: "grain",
    intensity: 0.5,
    scale: 1.5,
    color: "#000000",
    seed: randomSeed(),
    blend: "overlay",
    opacity: 0.6,
    ...over,
  };
}

export function text(over: Partial<TextLayer> = {}): TextLayer {
  return {
    ...base("Texto"),
    type: "text",
    text: "hola mundo",
    font: "inter",
    weight: 800,
    size: 0.12,
    color: "#ffffff",
    x: 0.5,
    y: 0.5,
    align: "center",
    letterSpacing: -0.02,
    lineHeight: 1.05,
    rotation: 0,
    uppercase: false,
    ...over,
  };
}

export function image(over: Over<ImageLayer> = {}): ImageLayer {
  const { placement: p, ...rest } = over;
  return {
    ...base("Fotos"),
    type: "image",
    images: [],
    mode: "items",
    fit: "cover",
    zoom: 1,
    focusX: 0.5,
    focusY: 0.5,
    frame: "polaroid",
    frameColor: "#ffffff",
    brightness: 1,
    contrast: 1,
    saturation: 1,
    grayscale: 0,
    hue: 0,
    shadow: { enabled: true, color: "#00000066", blur: 1.5, x: 0, y: 0.6 },
    ...rest,
    placement: placement({ mode: "scatter", count: 6, sizeMin: 0.2, sizeMax: 0.3, randomRotation: 14, ...p }),
  };
}

export const anim = (kind: Animation["kind"], over: Partial<Animation> = {}): Animation => ({ kind, speed: 1, amount: 0.5, angle: 270, ...over });

export function createLayer(type: LayerType): Layer {
  switch (type) {
    case "shape":
      return shape();
    case "emoji":
      return emoji();
    case "icon":
      return icon();
    case "pattern":
      return pattern();
    case "texture":
      return texture();
    case "text":
      return text();
    case "image":
      return image();
  }
}

export function cloneLayer<T extends Layer>(l: T): T {
  return { ...structuredClone(l), id: uid(), name: `${l.name} copia` };
}

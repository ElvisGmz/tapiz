import {
  Circle,
  CircleDot,
  Cloud,
  Flower,
  Grid3x3,
  Heart,
  Hexagon,
  PawPrint,
  Plus,
  Shapes,
  Smile,
  Sparkles,
  Square,
  Star,
  Triangle,
  Type,
  Waves,
  DoorClosed,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";
import type { BlendMode, LayerType, PatternKind, ShapeKind, TextureKind } from "@/lib/types";

export const LAYER_META: Record<LayerType, { label: string; icon: LucideIcon; color: string }> = {
  shape: { label: "Forma", icon: Shapes, color: "text-sky-300" },
  emoji: { label: "Emoji", icon: Smile, color: "text-amber-300" },
  icon: { label: "Ícono", icon: Star, color: "text-emerald-300" },
  pattern: { label: "Patrón", icon: Grid3x3, color: "text-pink-300" },
  texture: { label: "Textura", icon: Sparkles, color: "text-orange-300" },
  text: { label: "Texto", icon: Type, color: "text-violet-300" },
  image: { label: "Foto", icon: ImageIcon, color: "text-rose-300" },
};

export const ANIMAL_ICON = PawPrint;

export const SHAPES: { value: ShapeKind; label: string; icon: LucideIcon }[] = [
  { value: "circle", label: "Círculo", icon: Circle },
  { value: "rect", label: "Rectángulo", icon: Square },
  { value: "triangle", label: "Triángulo", icon: Triangle },
  { value: "star", label: "Estrella", icon: Star },
  { value: "polygon", label: "Polígono", icon: Hexagon },
  { value: "blob", label: "Blob", icon: Cloud },
  { value: "ring", label: "Anillo", icon: CircleDot },
  { value: "heart", label: "Corazón", icon: Heart },
  { value: "arch", label: "Arco", icon: DoorClosed },
  { value: "plus", label: "Cruz", icon: Plus },
  { value: "squiggle", label: "Garabato", icon: Waves },
  { value: "flower", label: "Flor", icon: Flower },
];

export const PATTERNS: { value: PatternKind; label: string }[] = [
  { value: "dots", label: "Puntos" },
  { value: "grid", label: "Rejilla" },
  { value: "lines", label: "Líneas" },
  { value: "diagonal", label: "Diagonal" },
  { value: "checker", label: "Ajedrez" },
  { value: "waves", label: "Ondas" },
  { value: "zigzag", label: "Zigzag" },
  { value: "triangles", label: "Triángulos" },
  { value: "hexagons", label: "Hexágonos" },
  { value: "scales", label: "Escamas" },
  { value: "plus", label: "Cruces" },
  { value: "crosshatch", label: "Tramado" },
  { value: "diamonds", label: "Rombos" },
  { value: "rings", label: "Anillos" },
  { value: "rays", label: "Rayos" },
  { value: "topography", label: "Topografía" },
];

export const TEXTURES: { value: TextureKind; label: string; usesColor: boolean }[] = [
  { value: "grain", label: "Grano", usesColor: false },
  { value: "color-noise", label: "Ruido color", usesColor: false },
  { value: "paper", label: "Papel", usesColor: false },
  { value: "canvas", label: "Lienzo", usesColor: false },
  { value: "halftone", label: "Halftone", usesColor: true },
  { value: "speckle", label: "Motas", usesColor: true },
  { value: "scanlines", label: "Scanlines", usesColor: true },
  { value: "vignette", label: "Viñeta", usesColor: true },
  { value: "glow", label: "Destellos", usesColor: true },
];

export const BLENDS: { value: BlendMode; label: string }[] = [
  { value: "source-over", label: "Normal" },
  { value: "multiply", label: "Multiplicar" },
  { value: "screen", label: "Trama (screen)" },
  { value: "overlay", label: "Superponer" },
  { value: "soft-light", label: "Luz suave" },
  { value: "hard-light", label: "Luz fuerte" },
  { value: "color-dodge", label: "Sobreexponer" },
  { value: "color-burn", label: "Subexponer" },
  { value: "lighten", label: "Aclarar" },
  { value: "darken", label: "Oscurecer" },
  { value: "difference", label: "Diferencia" },
  { value: "exclusion", label: "Exclusión" },
  { value: "hue", label: "Tono" },
  { value: "saturation", label: "Saturación" },
  { value: "color", label: "Color" },
  { value: "luminosity", label: "Luminosidad" },
];

"use client";

import { Dices, Plus, X } from "lucide-react";
import { PALETTES } from "@/lib/catalog";
import { FONTS } from "@/lib/fonts";
import { randomSeed } from "@/lib/random";
import type { Editor } from "@/lib/store";
import type {
  EmojiLayer,
  FontKey,
  IconLayer,
  Layer,
  PatternLayer,
  Placement,
  ShapeLayer,
  TextLayer,
  TextureLayer,
} from "@/lib/types";
import { anim as makeAnim } from "@/lib/factory";
import { ANIMS_FOR } from "@/lib/render/motion";
import type { AnimKind, Animation, BackgroundAnimKind, ImageLayer, PhotoFrame } from "@/lib/types";
import { FillEditor } from "./FillEditor";
import { PhotoPicker } from "./PhotoPicker";
import { BLENDS, LAYER_META, PATTERNS, SHAPES, TEXTURES } from "./meta";
import { EmojiPicker, IconPicker } from "./Pickers";
import { Button, ColorField, Section, Segmented, Select, Slider, Toggle, cx } from "./ui";

type Update<T extends Layer> = (patch: Partial<T> | ((l: T) => T), key?: string) => void;

const pct = (v: number) => `${Math.round(v * 100)}%`;
const deg = (v: number) => `${Math.round(v)}°`;

export function Inspector({ editor }: { editor: Editor }) {
  const { doc, selected } = editor;

  if (selected === "background") {
    return (
      <>
        <Header title="Fondo" subtitle="La base de tu wallpaper" />
        <Section title="Relleno">
          <FillEditor allowMesh fill={doc.background} onChange={(background, key) => editor.setDoc((d) => ({ ...d, background }), key && `bg:${key}`)} />
        </Section>
        <BackgroundAnimControls editor={editor} />
      </>
    );
  }

  const layer = doc.layers.find((l) => l.id === selected);
  if (!layer) return <p className="p-6 text-sm text-zinc-500">Selecciona una capa.</p>;
  const update = ((patch, key) => editor.updateLayer(layer.id, patch as never, key)) as Update<Layer>;
  const meta = LAYER_META[layer.type];

  return (
    <>
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
        <meta.icon size={16} className={meta.color} />
        <input className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none" value={layer.name} onChange={(e) => update({ name: e.target.value }, "name")} />
        <span className="text-[11px] text-zinc-500">{meta.label}</span>
      </div>

      {layer.type === "shape" && <ShapeControls layer={layer} update={update as Update<ShapeLayer>} />}
      {layer.type === "emoji" && <EmojiControls layer={layer} update={update as Update<EmojiLayer>} />}
      {layer.type === "icon" && <IconControls layer={layer} update={update as Update<IconLayer>} />}
      {layer.type === "pattern" && <PatternControls layer={layer} update={update as Update<PatternLayer>} />}
      {layer.type === "texture" && <TextureControls layer={layer} update={update as Update<TextureLayer>} />}
      {layer.type === "text" && <TextControls layer={layer} update={update as Update<TextLayer>} />}
      {layer.type === "image" && <ImageControls layer={layer} update={update as Update<ImageLayer>} />}

      {"placement" in layer && !(layer.type === "image" && layer.mode === "fill") && (
        <PlacementControls p={layer.placement} onChange={(p, key) => update((l) => ({ ...l, placement: { ...(l as ShapeLayer).placement, ...p } }) as Layer, key)} />
      )}

      {ANIMS_FOR[layer.type] && !(layer.type === "image" && layer.mode === "fill") && (
        <AnimControls
          type={layer.type}
          anim={layer.anim}
          kinds={
            layer.type === "pattern"
              ? // Topography ignores rotation but can morph; tiled patterns can't morph.
                layer.pattern === "topography"
                ? ["none", "morph", "drift"]
                : ANIMS_FOR.pattern.filter((k) => k !== "morph")
              : undefined
          }
          onChange={(anim, key) => update({ anim } as Partial<Layer>, key)}
        />
      )}

      <Section title="Efectos">
        <Slider label="Opacidad" value={layer.opacity} min={0} max={1} format={pct} onChange={(opacity) => update({ opacity }, "opacity")} />
        <Select label="Fusión" value={layer.blend} options={BLENDS} onChange={(blend) => update({ blend })} />
        <Slider label="Desenfoque" value={layer.blur} min={0} max={15} step={0.1} onChange={(blur) => update({ blur }, "blur")} />
        <Toggle label="Sombra / brillo" checked={layer.shadow.enabled} onChange={(enabled) => update({ shadow: { ...layer.shadow, enabled } })} />
        {layer.shadow.enabled && (
          <div className="space-y-3 rounded-lg bg-black/20 p-3">
            <ColorField value={layer.shadow.color} onChange={(color) => update({ shadow: { ...layer.shadow, color } }, "shc")} />
            <Slider label="Difuminado" value={layer.shadow.blur} min={0} max={10} step={0.1} onChange={(blur) => update({ shadow: { ...layer.shadow, blur } }, "shb")} />
            <Slider label="Desplazamiento X" value={layer.shadow.x} min={-3} max={3} step={0.05} onChange={(x) => update({ shadow: { ...layer.shadow, x } }, "shx")} />
            <Slider label="Desplazamiento Y" value={layer.shadow.y} min={-3} max={3} step={0.05} onChange={(y) => update({ shadow: { ...layer.shadow, y } }, "shy")} />
          </div>
        )}
      </Section>
    </>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-b border-white/5 px-4 py-3">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="text-xs text-zinc-500">{subtitle}</p>
    </div>
  );
}

function PaletteColors({ colors, onChange }: { colors: string[]; onChange: (c: string[], key?: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {colors.map((c, i) => (
          <div key={i} className="group relative">
            <ColorField compact value={c} onChange={(v) => onChange(colors.map((x, j) => (j === i ? v : x)), `pc${i}`)} />
            {colors.length > 1 && (
              <button
                onClick={() => onChange(colors.filter((_, j) => j !== i))}
                className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-zinc-300 ring-1 ring-white/20 group-hover:flex pointer-coarse:flex"
              >
                <X size={10} />
              </button>
            )}
          </div>
        ))}
        {colors.length < 10 && (
          <button onClick={() => onChange([...colors, colors[colors.length - 1] ?? "#ffffff"])} className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 ring-1 ring-dashed ring-white/15 hover:text-white">
            <Plus size={14} />
          </button>
        )}
      </div>
      <div className="tz-scroll -m-1 flex gap-1.5 overflow-x-auto p-1 pb-2">
        {PALETTES.map((p) => (
          <button key={p.name} title={p.name} onClick={() => onChange(p.colors)} className="flex h-5 w-12 shrink-0 overflow-hidden rounded-md ring-1 ring-white/10 hover:ring-white/40">
            {p.colors.map((c) => (
              <span key={c} className="flex-1" style={{ background: c }} />
            ))}
          </button>
        ))}
      </div>
    </div>
  );
}

function ShapeControls({ layer, update }: { layer: ShapeLayer; update: Update<ShapeLayer> }) {
  const s = layer.shape;
  return (
    <>
      <Section title="Forma">
        <div className="grid grid-cols-6 gap-1">
          {SHAPES.map((o) => (
            <button
              key={o.value}
              title={o.label}
              onClick={() => update({ shape: o.value })}
              className={cx("flex aspect-square items-center justify-center rounded-lg transition", s === o.value ? "bg-violet-500/25 text-white ring-1 ring-violet-400/50" : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white")}
            >
              <o.icon size={17} />
            </button>
          ))}
        </div>
        {["circle", "rect", "triangle", "arch", "heart", "squiggle", "star", "polygon", "ring", "blob"].includes(s) && (
          <Slider label="Proporción" value={layer.aspect} min={0.3} max={3} onChange={(aspect) => update({ aspect }, "aspect")} />
        )}
        {s === "rect" && <Slider label="Redondeo" value={layer.corner} min={0} max={0.5} onChange={(corner) => update({ corner }, "corner")} />}
        {(s === "star" || s === "polygon" || s === "flower" || s === "squiggle") && (
          <Slider label={s === "squiggle" ? "Ondas" : s === "flower" ? "Pétalos" : "Puntas"} value={layer.points} min={3} max={s === "squiggle" ? 16 : 14} step={1} onChange={(points) => update({ points }, "points")} />
        )}
        {(s === "star" || s === "ring" || s === "plus" || s === "squiggle") && (
          <Slider label={s === "star" ? "Profundidad" : "Grosor"} value={layer.inner} min={0.05} max={0.95} onChange={(inner) => update({ inner }, "inner")} />
        )}
      </Section>
      <Section title="Color">
        <Segmented
          value={layer.colorMode}
          options={[
            { value: "fill", label: "Relleno / degradado" },
            { value: "palette", label: "Paleta aleatoria" },
          ]}
          onChange={(colorMode) => update({ colorMode })}
        />
        {layer.colorMode === "fill" ? (
          <FillEditor fill={layer.fill} onChange={(fill, key) => update({ fill }, key && `fill:${key}`)} />
        ) : (
          <PaletteColors colors={layer.palette} onChange={(palette, key) => update({ palette }, key)} />
        )}
        <Toggle label="Contorno" checked={layer.stroke.enabled} onChange={(enabled) => update({ stroke: { ...layer.stroke, enabled } })} />
        {layer.stroke.enabled && (
          <>
            <ColorField value={layer.stroke.color} onChange={(color) => update({ stroke: { ...layer.stroke, color } }, "stc")} />
            <Slider label="Grosor contorno" value={layer.stroke.width} min={0.5} max={15} step={0.1} onChange={(width) => update({ stroke: { ...layer.stroke, width } }, "stw")} />
          </>
        )}
      </Section>
    </>
  );
}

function EmojiControls({ layer, update }: { layer: EmojiLayer; update: Update<EmojiLayer> }) {
  return (
    <Section title="Emojis">
      <EmojiPicker selected={layer.chars} onChange={(chars) => update({ chars })} initialCategory={layer.name.toLowerCase().includes("anim") ? "Animales" : undefined} />
      <Segmented
        label="Estilo"
        value={layer.style}
        options={[
          { value: "twemoji", label: "Twemoji", title: "Vectorial — nítido en 4K+" },
          { value: "openmoji", label: "OpenMoji", title: "Vectorial, estilo flat con contorno" },
          { value: "system", label: "Sistema", title: "Emoji nativo de tu sistema operativo" },
        ]}
        onChange={(style) => update({ style })}
      />
      <p className="text-[10.5px] leading-snug text-zinc-600">
        {layer.style === "twemoji" && "Twemoji © Twitter/X y colaboradores · CC BY 4.0"}
        {layer.style === "openmoji" && "OpenMoji · CC BY-SA 4.0 — si publicas tu wallpaper, da crédito a openmoji.org"}
        {layer.style === "system" && "Emojis de tu sistema operativo"}
      </p>
    </Section>
  );
}

function IconControls({ layer, update }: { layer: IconLayer; update: Update<IconLayer> }) {
  return (
    <>
      <Section title="Íconos">
        <IconPicker selected={layer.icons} onChange={(icons) => update({ icons })} initialCategory={layer.name.toLowerCase().includes("anim") ? "Animales" : undefined} />
      </Section>
      <Section title="Estilo">
        <PaletteColors colors={layer.colors} onChange={(colors, key) => update({ colors }, key)} />
        <Slider label="Grosor de línea" value={layer.strokeWidth} min={0.5} max={4} step={0.05} onChange={(strokeWidth) => update({ strokeWidth }, "sw")} />
        <Toggle label="Relleno sólido" checked={layer.filled} onChange={(filled) => update({ filled })} />
      </Section>
    </>
  );
}

function PatternControls({ layer, update }: { layer: PatternLayer; update: Update<PatternLayer> }) {
  return (
    <Section title="Patrón">
      <div className="grid grid-cols-4 gap-1">
        {PATTERNS.map((o) => (
          <button
            key={o.value}
            onClick={() => update({ pattern: o.value })}
            className={cx("rounded-lg px-1 py-1.5 text-[11px] transition", layer.pattern === o.value ? "bg-violet-500/25 text-white ring-1 ring-violet-400/50" : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white")}
          >
            {o.label}
          </button>
        ))}
      </div>
      <ColorField label="Color" value={layer.color} onChange={(color) => update({ color }, "color")} />
      <Slider label="Escala" value={layer.size} min={0.01} max={0.3} step={0.001} format={pct} onChange={(size) => update({ size }, "size")} />
      <Slider label="Grosor" value={layer.thickness} min={0.02} max={1} onChange={(thickness) => update({ thickness }, "thick")} />
      {layer.pattern !== "rings" && layer.pattern !== "topography" && (
        <Slider label="Rotación" value={layer.rotation} min={-180} max={180} step={1} format={deg} onChange={(rotation) => update({ rotation }, "rot")} />
      )}
      {layer.pattern === "topography" && (
        <Button variant="soft" className="w-full" onClick={() => update({ seed: randomSeed() })}>
          <Dices size={14} /> Nuevo terreno
        </Button>
      )}
    </Section>
  );
}

function TextureControls({ layer, update }: { layer: TextureLayer; update: Update<TextureLayer> }) {
  const meta = TEXTURES.find((t) => t.value === layer.texture);
  return (
    <Section title="Textura">
      <div className="grid grid-cols-3 gap-1">
        {TEXTURES.map((o) => (
          <button
            key={o.value}
            onClick={() => update({ texture: o.value })}
            className={cx("rounded-lg px-1 py-1.5 text-[11px] transition", layer.texture === o.value ? "bg-violet-500/25 text-white ring-1 ring-violet-400/50" : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white")}
          >
            {o.label}
          </button>
        ))}
      </div>
      <Slider label="Intensidad" value={layer.intensity} min={0} max={1} format={pct} onChange={(intensity) => update({ intensity }, "int")} />
      <Slider label="Escala" value={layer.scale} min={0.5} max={6} step={0.1} onChange={(scale) => update({ scale }, "scale")} />
      {meta?.usesColor && <ColorField label="Color" value={layer.color} onChange={(color) => update({ color }, "color")} />}
      <Button variant="soft" className="w-full" onClick={() => update({ seed: randomSeed() })}>
        <Dices size={14} /> Variar
      </Button>
      <p className="text-[11px] leading-snug text-zinc-500">Tip: las texturas lucen mejor con fusión “Superponer” o “Luz suave”.</p>
    </Section>
  );
}

function TextControls({ layer, update }: { layer: TextLayer; update: Update<TextLayer> }) {
  const font = FONTS[layer.font];
  return (
    <Section title="Texto">
      <textarea className="tz-input min-h-16 w-full resize-y text-sm" value={layer.text} onChange={(e) => update({ text: e.target.value }, "text")} />
      <Select
        label="Tipografía"
        value={layer.font}
        options={(Object.keys(FONTS) as FontKey[]).map((k) => ({ value: k, label: FONTS[k].label }))}
        onChange={(f) => update({ font: f, weight: FONTS[f].weights.includes(layer.weight) ? layer.weight : FONTS[f].weights[FONTS[f].weights.length - 1] })}
      />
      {font.weights.length > 1 && (
        <Segmented label="Peso" value={String(layer.weight)} options={font.weights.map((w) => ({ value: String(w), label: String(w) }))} onChange={(w) => update({ weight: Number(w) })} />
      )}
      <ColorField label="Color" value={layer.color} onChange={(color) => update({ color }, "color")} />
      <Slider label="Tamaño" value={layer.size} min={0.02} max={0.6} step={0.001} format={pct} onChange={(size) => update({ size }, "size")} />
      <Segmented
        label="Alineación"
        value={layer.align as "left" | "center" | "right"}
        options={[
          { value: "left", label: "Izq." },
          { value: "center", label: "Centro" },
          { value: "right", label: "Der." },
        ]}
        onChange={(align) => update({ align })}
      />
      <Slider label="Espaciado letras" value={layer.letterSpacing} min={-0.1} max={0.5} step={0.005} onChange={(letterSpacing) => update({ letterSpacing }, "ls")} />
      <Slider label="Interlineado" value={layer.lineHeight} min={0.7} max={2} onChange={(lineHeight) => update({ lineHeight }, "lh")} />
      <Slider label="Rotación" value={layer.rotation} min={-180} max={180} step={1} format={deg} onChange={(rotation) => update({ rotation }, "rot")} />
      <Toggle label="MAYÚSCULAS" checked={layer.uppercase} onChange={(uppercase) => update({ uppercase })} />
    </Section>
  );
}

function PlacementControls({ p, onChange }: { p: Placement; onChange: (p: Partial<Placement>, key?: string) => void }) {
  return (
    <Section
      title="Distribución"
      action={
        p.mode !== "single" && (
          <button onClick={() => onChange({ seed: randomSeed() })} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-violet-300 hover:bg-violet-500/10">
            <Dices size={12} /> Barajar
          </button>
        )
      }
    >
      <Segmented
        value={p.mode}
        options={[
          { value: "single", label: "Uno" },
          { value: "scatter", label: "Dispersión" },
          { value: "grid", label: "Mosaico" },
        ]}
        onChange={(mode) => onChange({ mode })}
      />
      {p.mode === "single" && (
        <>
          <Slider label="Tamaño" value={p.size} min={0.02} max={2} step={0.005} format={pct} onChange={(size) => onChange({ size }, "size")} />
          <div className="grid grid-cols-2 gap-3">
            <Slider label="X" value={p.x} min={-0.2} max={1.2} format={pct} onChange={(x) => onChange({ x }, "x")} />
            <Slider label="Y" value={p.y} min={-0.2} max={1.2} format={pct} onChange={(y) => onChange({ y }, "y")} />
          </div>
        </>
      )}
      {p.mode === "scatter" && (
        <>
          <Slider label="Cantidad" value={p.count} min={1} max={400} step={1} format={(v) => String(v)} onChange={(count) => onChange({ count }, "count")} />
          <div className="grid grid-cols-2 gap-3">
            <Slider label="Tamaño mín." value={p.sizeMin} min={0.005} max={0.6} step={0.005} format={pct} onChange={(sizeMin) => onChange({ sizeMin }, "smin")} />
            <Slider label="Tamaño máx." value={p.sizeMax} min={0.005} max={0.6} step={0.005} format={pct} onChange={(sizeMax) => onChange({ sizeMax }, "smax")} />
          </div>
        </>
      )}
      {p.mode === "grid" && (
        <>
          <Slider label="Separación" value={p.spacing} min={0.03} max={0.6} step={0.005} format={pct} onChange={(spacing) => onChange({ spacing }, "spacing")} />
          <Slider label="Tamaño" value={p.size} min={0.01} max={0.5} step={0.005} format={pct} onChange={(size) => onChange({ size }, "size")} />
          <Slider label="Desorden" value={p.jitter} min={0} max={1} format={pct} onChange={(jitter) => onChange({ jitter }, "jitter")} />
          <Toggle label="Filas alternas" checked={p.stagger} onChange={(stagger) => onChange({ stagger })} />
        </>
      )}
      <Slider label="Rotación" value={p.rotation} min={-180} max={180} step={1} format={deg} onChange={(rotation) => onChange({ rotation }, "rot")} />
      {p.mode !== "single" && (
        <Slider label="Rotación aleatoria" value={p.randomRotation} min={0} max={180} step={1} format={(v) => `±${Math.round(v)}°`} onChange={(randomRotation) => onChange({ randomRotation }, "rrot")} />
      )}
    </Section>
  );
}

const ANIM_LABELS: Record<AnimKind, string> = {
  none: "Quieto",
  drift: "Deriva",
  float: "Flotar",
  sway: "Balanceo",
  spin: "Girar",
  pulse: "Latir",
  twinkle: "Parpadeo",
  flow: "Fluir",
  flicker: "Grano vivo",
  morph: "Transformar",
};

const DIRECTIONS = [
  { angle: 270, label: "↑" },
  { angle: 315, label: "↗" },
  { angle: 0, label: "→" },
  { angle: 45, label: "↘" },
  { angle: 90, label: "↓" },
  { angle: 135, label: "↙" },
  { angle: 180, label: "←" },
  { angle: 225, label: "↖" },
];

function AnimControls({
  type,
  anim,
  onChange,
  kinds = ANIMS_FOR[type],
}: {
  type: Layer["type"];
  anim?: Animation;
  onChange: (a: Animation, key?: string) => void;
  kinds?: AnimKind[];
}) {
  const current = anim ?? makeAnim("none");
  return (
    <Section title="Animación">
      <div className="grid grid-cols-4 gap-1">
        {kinds.map((k) => (
          <button
            key={k}
            onClick={() => onChange({ ...current, kind: k })}
            className={cx("rounded-lg px-1 py-1.5 text-[11px] transition", current.kind === k ? "bg-violet-500/25 text-white ring-1 ring-violet-400/50" : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white")}
          >
            {ANIM_LABELS[k]}
          </button>
        ))}
      </div>
      {current.kind !== "none" && (
        <>
          {current.kind === "drift" && type !== "pattern" && (
            <div>
              <p className="mb-1.5 text-xs text-zinc-400">Dirección</p>
              <div className="grid grid-cols-8 gap-1">
                {DIRECTIONS.map((d) => (
                  <button
                    key={d.angle}
                    onClick={() => onChange({ ...current, angle: d.angle })}
                    className={cx("rounded-md py-1 text-sm", current.angle === d.angle ? "bg-violet-500/30 text-white" : "bg-white/5 text-zinc-400 hover:text-white")}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Slider label="Velocidad" value={current.speed} min={1} max={4} step={1} format={(v) => `${v}× por loop`} onChange={(speed) => onChange({ ...current, speed }, "aspeed")} />
          {current.kind !== "spin" && current.kind !== "flicker" && (
            <Slider
              label={current.kind === "drift" ? (type === "pattern" ? "Recorrido" : "Profundidad (parallax)") : current.kind === "morph" ? "Cuánto cambia el terreno" : "Intensidad"}
              value={current.amount}
              min={0}
              max={1}
              format={pct}
              onChange={(amount) => onChange({ ...current, amount }, "aamount")}
            />
          )}
        </>
      )}
    </Section>
  );
}

function BackgroundAnimControls({ editor }: { editor: Editor }) {
  const bg = editor.doc.backgroundAnim ?? { kind: "none" as BackgroundAnimKind, speed: 1, amount: 0.5 };
  const kind = editor.doc.background.kind;
  const set = (patch: Partial<typeof bg>, key?: string) => editor.setDoc((d) => ({ ...d, backgroundAnim: { ...bg, ...patch } }), key && `bganim:${key}`);
  const options: { value: BackgroundAnimKind; label: string }[] = [
    { value: "none", label: "Quieto" },
    { value: "shift", label: kind === "mesh" || kind === "radial" ? "Mover" : "Oscilar" },
    ...(kind === "linear" || kind === "conic" ? [{ value: "rotate" as const, label: "Girar" }] : []),
    ...(kind === "mesh" || kind === "radial" ? [{ value: "breathe" as const, label: "Respirar" }] : []),
  ];
  if (kind === "solid") return null;
  return (
    <Section title="Animación del fondo">
      <Segmented value={options.some((o) => o.value === bg.kind) ? bg.kind : "none"} options={options} onChange={(k) => set({ kind: k })} />
      {bg.kind !== "none" && (
        <>
          <Slider label="Velocidad" value={bg.speed} min={1} max={4} step={1} format={(v) => `${v}× por loop`} onChange={(speed) => set({ speed }, "speed")} />
          {bg.kind !== "rotate" && <Slider label="Intensidad" value={bg.amount} min={0} max={1} format={pct} onChange={(amount) => set({ amount }, "amount")} />}
        </>
      )}
    </Section>
  );
}

const FRAMES: { value: PhotoFrame; label: string }[] = [
  { value: "none", label: "Sin marco" },
  { value: "rounded", label: "Redondeada" },
  { value: "circle", label: "Círculo" },
  { value: "polaroid", label: "Polaroid" },
  { value: "arch", label: "Arco" },
  { value: "blob", label: "Blob" },
];

function ImageControls({ layer, update }: { layer: ImageLayer; update: Update<ImageLayer> }) {
  const fill = layer.mode === "fill";
  return (
    <>
      <Section title="Fotos">
        <Segmented
          value={layer.mode}
          onChange={(mode) => update({ mode, ...(mode === "fill" ? { images: layer.images.slice(0, 1) } : {}) })}
          options={[
            { value: "fill", label: "Fondo completo" },
            { value: "items", label: "Como elementos" },
          ]}
        />
        <PhotoPicker
          selected={layer.images}
          single={fill}
          onChange={(images, picked) =>
            // Transparent images (stickers, cutouts) look wrong inside a white polaroid: show them frameless.
            update(picked?.some((p) => p.hasAlpha) && layer.frame === "polaroid" ? { images, frame: "none" } : { images })
          }
        />
      </Section>
      {fill ? (
        <Section title="Encuadre">
          <Segmented
            value={layer.fit}
            onChange={(fit) => update({ fit })}
            options={[
              { value: "cover", label: "Cubrir" },
              { value: "contain", label: "Contener" },
            ]}
          />
          <Slider label="Zoom" value={layer.zoom} min={0.3} max={3} format={(v) => `${v.toFixed(2)}×`} onChange={(zoom) => update({ zoom }, "zoom")} />
          <div className="grid grid-cols-2 gap-3">
            <Slider label="Foco X" value={layer.focusX} min={0} max={1} format={pct} onChange={(focusX) => update({ focusX }, "fx")} />
            <Slider label="Foco Y" value={layer.focusY} min={0} max={1} format={pct} onChange={(focusY) => update({ focusY }, "fy")} />
          </div>
        </Section>
      ) : (
        <Section title="Marco">
          <div className="grid grid-cols-3 gap-1">
            {FRAMES.map((o) => (
              <button
                key={o.value}
                onClick={() => update({ frame: o.value })}
                className={cx("rounded-lg px-1 py-1.5 text-[11px] transition", layer.frame === o.value ? "bg-violet-500/25 text-white ring-1 ring-violet-400/50" : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white")}
              >
                {o.label}
              </button>
            ))}
          </div>
          {layer.frame === "polaroid" && <ColorField label="Color del marco" value={layer.frameColor} onChange={(frameColor) => update({ frameColor }, "fc")} />}
        </Section>
      )}
      <Section title="Ajustes de imagen">
        <Slider label="Brillo" value={layer.brightness} min={0.3} max={1.8} format={pct} onChange={(brightness) => update({ brightness }, "br")} />
        <Slider label="Contraste" value={layer.contrast} min={0.3} max={1.8} format={pct} onChange={(contrast) => update({ contrast }, "ct")} />
        <Slider label="Saturación" value={layer.saturation} min={0} max={2.5} format={pct} onChange={(saturation) => update({ saturation }, "sat")} />
        <Slider label="Blanco y negro" value={layer.grayscale} min={0} max={1} format={pct} onChange={(grayscale) => update({ grayscale }, "gs")} />
        <Slider label="Tono" value={layer.hue} min={-180} max={180} step={1} format={deg} onChange={(hue) => update({ hue }, "hue")} />
      </Section>
    </>
  );
}

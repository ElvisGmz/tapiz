"use client";

import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, GripVertical, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { EMOJI_CATEGORIES } from "@/lib/catalog";
import { emoji, icon, image, pattern, shape, text, texture } from "@/lib/factory";
import type { Editor } from "@/lib/store";
import type { Layer, LayerType } from "@/lib/types";
import { cssGradient } from "./FillEditor";
import { ANIMAL_ICON, LAYER_META } from "./meta";
import { Popover, cx } from "./ui";

const ADD_ITEMS: { label: string; desc: string; icon: typeof ANIMAL_ICON; color: string; make: () => Layer | LayerType }[] = [
  { ...LAYER_META.shape, desc: "Círculos, blobs, estrellas…", make: () => "shape" },
  { ...LAYER_META.emoji, desc: "Twemoji / OpenMoji vectoriales", make: () => "emoji" },
  {
    label: "Animales",
    icon: ANIMAL_ICON,
    color: "text-lime-300",
    desc: "Zoológico de emojis",
    make: () => emoji({ name: "Animales", chars: EMOJI_CATEGORIES[0].emojis.slice(0, 8) }),
  },
  { ...LAYER_META.icon, desc: "+2000 íconos Lucide", make: () => "icon" },
  { ...LAYER_META.image, label: "Tus fotos", desc: "Sube, pega (⌘V) o trae por link", make: () => "image" },
  { ...LAYER_META.image, label: "Foto de fondo", desc: "Una foto a pantalla completa", make: () => image({ name: "Foto de fondo", mode: "fill", shadow: { enabled: false, color: "#000000", blur: 2, x: 0, y: 0.6 } }) },
  { ...LAYER_META.pattern, desc: "Puntos, ondas, topografía…", make: () => "pattern" },
  { ...LAYER_META.texture, desc: "Grano, papel, halftone…", make: () => "texture" },
  { ...LAYER_META.text, desc: "Frases con 9 tipografías", make: () => "text" },
];

const RECIPES: { label: string; emoji: string; make: () => Layer }[] = [
  {
    label: "Blob aurora",
    emoji: "🫧",
    make: () =>
      shape({
        name: "Blob aurora",
        shape: "blob",
        blur: 9,
        blend: "screen",
        opacity: 0.85,
        fill: { kind: "linear", angle: 140, stops: [{ color: "#7b2ff7", pos: 0 }, { color: "#2de2e6", pos: 1 }] },
        placement: { size: 0.7, x: 0.4, y: 0.45 },
      }),
  },
  {
    label: "Confeti",
    emoji: "🎊",
    make: () =>
      shape({
        name: "Confeti",
        shape: "rect",
        aspect: 2.5,
        corner: 0.5,
        colorMode: "palette",
        palette: ["#ff4d6d", "#ffd166", "#06d6a0", "#118ab2", "#ffffff"],
        placement: { mode: "scatter", count: 160, sizeMin: 0.012, sizeMax: 0.03, randomRotation: 180 },
      }),
  },
  {
    label: "Lluvia de estrellas",
    emoji: "✨",
    make: () =>
      icon({
        name: "Estrellas",
        icons: ["Sparkle", "Star"],
        colors: ["#fff4b8", "#ffffff"],
        filled: true,
        placement: { mode: "scatter", count: 60, sizeMin: 0.01, sizeMax: 0.035, randomRotation: 30 },
      }),
  },
  { label: "Grano de película", emoji: "🎞️", make: () => texture({ name: "Grano film", intensity: 0.6, scale: 1.2 }) },
  { label: "Viñeta", emoji: "🌑", make: () => texture({ name: "Viñeta", texture: "vignette", intensity: 0.6, blend: "source-over", opacity: 1 }) },
  { label: "Topografía", emoji: "🗺️", make: () => pattern({ name: "Topografía", pattern: "topography", size: 0.1, thickness: 0.3, opacity: 0.3 }) },
  {
    label: "Burbujas",
    emoji: "🔵",
    make: () =>
      shape({
        name: "Burbujas",
        shape: "ring",
        inner: 0.12,
        fill: { kind: "solid", color: "#ffffff" },
        opacity: 0.35,
        placement: { mode: "scatter", count: 30, sizeMin: 0.02, sizeMax: 0.14 },
      }),
  },
  { label: "Título grande", emoji: "🔤", make: () => text({ name: "Título", text: "TAPIZ", font: "bebas", weight: 400, size: 0.35, letterSpacing: 0.04 }) },
];

export function LayersPanel({ editor, openMenuSignal = 0 }: { editor: Editor; openMenuSignal?: number }) {
  const { doc, selected } = editor;
  const [menu, setMenu] = useState(false);
  // Lets the help guide open this menu ("Añadir capa →").
  const [lastSignal, setLastSignal] = useState(openMenuSignal);
  if (openMenuSignal !== lastSignal) {
    setLastSignal(openMenuSignal);
    setMenu(true);
  }
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const reversed = [...doc.layers].reverse();

  const add = (l: Layer | LayerType) => {
    editor.addLayer(l);
    setMenu(false);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex items-center justify-between px-4 pb-2 pt-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Capas</h3>
        <button
          onClick={() => setMenu(true)}
          className="flex items-center gap-1 rounded-lg bg-violet-500/15 px-2 py-1 text-xs font-medium text-violet-200 ring-1 ring-violet-400/30 transition hover:bg-violet-500/25"
        >
          <Plus size={14} /> Añadir
        </button>
        <Popover open={menu} onClose={() => setMenu(false)} className="tz-scroll left-3 right-3 top-12 max-h-[78vh] overflow-y-auto">
          <div className="grid grid-cols-1 gap-0.5">
            {ADD_ITEMS.map((it) => (
              <button key={it.label} onClick={() => add(it.make())} className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-white/8">
                <it.icon size={18} className={it.color} />
                <span>
                  <span className="block text-sm text-zinc-100">{it.label}</span>
                  <span className="block text-[11px] text-zinc-500">{it.desc}</span>
                </span>
              </button>
            ))}
          </div>
          <p className="px-2.5 pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Recetas rápidas</p>
          <div className="grid grid-cols-2 gap-1">
            {RECIPES.map((r) => (
              <button key={r.label} onClick={() => add(r.make())} className="flex items-center gap-2 rounded-lg bg-white/4 px-2 py-1.5 text-left text-xs text-zinc-300 transition hover:bg-white/10 hover:text-white">
                <span className="text-base">{r.emoji}</span>
                {r.label}
              </button>
            ))}
          </div>
        </Popover>
      </div>

      <div className="tz-scroll flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {reversed.map((layer, ri) => {
          const index = doc.layers.length - 1 - ri;
          const meta = LAYER_META[layer.type];
          const active = selected === layer.id;
          return (
            <div
              key={layer.id}
              draggable
              onDragStart={(e) => {
                setDragId(layer.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIndex(index);
              }}
              onDragLeave={() => setOverIndex(null)}
              onDrop={() => {
                if (dragId) editor.moveLayer(dragId, index);
                setDragId(null);
                setOverIndex(null);
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverIndex(null);
              }}
              onClick={() => editor.select(layer.id)}
              className={cx(
                "group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition",
                active ? "bg-violet-500/15 ring-1 ring-violet-400/30" : "hover:bg-white/5",
                overIndex === index && dragId !== layer.id && "ring-1 ring-fuchsia-400/60",
                dragId === layer.id && "opacity-40",
                !layer.visible && "opacity-50",
              )}
            >
              <GripVertical size={12} className="shrink-0 cursor-grab text-zinc-600 opacity-0 group-hover:opacity-100" />
              <meta.icon size={15} className={cx("shrink-0", meta.color)} />
              <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-200">{layer.name}</span>
              <div className="flex items-center opacity-0 transition group-hover:opacity-100">
                <RowBtn title="Subir" onClick={() => editor.moveLayer(layer.id, index + 1)}>
                  <ArrowUp size={13} />
                </RowBtn>
                <RowBtn title="Bajar" onClick={() => editor.moveLayer(layer.id, index - 1)}>
                  <ArrowDown size={13} />
                </RowBtn>
                <RowBtn title="Duplicar" onClick={() => editor.duplicateLayer(layer.id)}>
                  <Copy size={13} />
                </RowBtn>
                <RowBtn title="Eliminar" onClick={() => editor.removeLayer(layer.id)}>
                  <Trash2 size={13} />
                </RowBtn>
              </div>
              <RowBtn title={layer.visible ? "Ocultar" : "Mostrar"} onClick={() => editor.updateLayer(layer.id, { visible: !layer.visible })}>
                {layer.visible ? <Eye size={13} /> : <EyeOff size={13} />}
              </RowBtn>
            </div>
          );
        })}

        <div
          onClick={() => editor.select("background")}
          className={cx(
            "mt-1 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition",
            selected === "background" ? "bg-violet-500/15 ring-1 ring-violet-400/30" : "hover:bg-white/5",
          )}
        >
          <span className="w-3" />
          <span className="h-4 w-4 shrink-0 rounded ring-1 ring-white/20" style={{ background: cssGradient(doc.background) }} />
          <span className="flex-1 text-[13px] text-zinc-200">Fondo</span>
          <ImageIcon size={13} className="text-zinc-600" />
        </div>
        {!doc.layers.length && <p className="px-3 py-4 text-center text-xs leading-relaxed text-zinc-500">Solo fondo por ahora. Dale a “Añadir” o prueba una plantilla ✨</p>}
      </div>
    </div>
  );
}

function RowBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="rounded p-1 text-zinc-500 hover:bg-white/10 hover:text-zinc-100"
    >
      {children}
    </button>
  );
}

"use client";

import { Plus, Trash2 } from "lucide-react";
import { PALETTES } from "@/lib/catalog";
import { fillColors } from "@/lib/render/fill";
import type { Fill, FillKind, GradientStop } from "@/lib/types";
import { ColorField, Segmented, Slider } from "./ui";

const KINDS: { value: FillKind; label: string }[] = [
  { value: "solid", label: "Sólido" },
  { value: "linear", label: "Lineal" },
  { value: "radial", label: "Radial" },
  { value: "conic", label: "Cónico" },
  { value: "mesh", label: "Mesh" },
];

const toStops = (colors: string[]): GradientStop[] => {
  const c = colors.length > 1 ? colors : [colors[0] ?? "#8b5cf6", "#ec4899"];
  return c.map((color, i) => ({ color, pos: i / (c.length - 1) }));
};

export function convertFill(fill: Fill, kind: FillKind): Fill {
  const colors = fillColors(fill);
  switch (kind) {
    case "solid":
      return { kind, color: colors[0] };
    case "linear":
      return { kind, angle: 135, stops: fill.kind !== "solid" && fill.kind !== "mesh" ? fill.stops : toStops(colors) };
    case "radial":
      return { kind, cx: 0.5, cy: 0.5, radius: 0.75, stops: fill.kind !== "solid" && fill.kind !== "mesh" ? fill.stops : toStops(colors) };
    case "conic":
      return { kind, cx: 0.5, cy: 0.5, angle: 0, stops: fill.kind !== "solid" && fill.kind !== "mesh" ? fill.stops : toStops(colors) };
    case "mesh": {
      const c = colors.length > 1 ? colors : [colors[0], "#ec4899", "#22d3ee", "#facc15"];
      const spots = [
        [0.15, 0.2],
        [0.85, 0.25],
        [0.25, 0.85],
        [0.8, 0.8],
        [0.5, 0.5],
      ];
      return {
        kind,
        base: c[0],
        points: c.slice(1, 6).map((color, i) => ({ color, x: spots[i][0], y: spots[i][1], radius: 0.6 })),
      };
    }
  }
}

function applyPalette(fill: Fill, colors: string[]): Fill {
  switch (fill.kind) {
    case "solid":
      return { ...fill, color: colors[0] };
    case "mesh":
      return { ...fill, base: colors[0], points: fill.points.map((p, i) => ({ ...p, color: colors[(i + 1) % colors.length] })) };
    default:
      return { ...fill, stops: toStops(colors.slice(0, Math.max(2, fill.stops.length))) };
  }
}

export function cssGradient(fill: Fill) {
  if (fill.kind === "solid") return fill.color;
  if (fill.kind === "mesh") return `linear-gradient(90deg, ${[fill.base, ...fill.points.map((p) => p.color)].join(",")})`;
  const stops = [...fill.stops].sort((a, b) => a.pos - b.pos).map((s) => `${s.color} ${s.pos * 100}%`).join(",");
  return `linear-gradient(90deg, ${stops})`;
}

export function FillEditor({ fill, onChange, allowMesh }: { fill: Fill; onChange: (f: Fill, key?: string) => void; allowMesh?: boolean }) {
  const kinds = allowMesh ? KINDS : KINDS.filter((k) => k.value !== "mesh");

  return (
    <div className="space-y-3">
      <Segmented value={fill.kind} options={kinds} onChange={(k) => onChange(convertFill(fill, k))} />

      {fill.kind === "solid" && <ColorField value={fill.color} onChange={(color) => onChange({ ...fill, color }, "color")} />}

      {(fill.kind === "linear" || fill.kind === "radial" || fill.kind === "conic") && (
        <>
          <div className="h-3 rounded-full ring-1 ring-white/10" style={{ background: cssGradient(fill) }} />
          <div className="space-y-2">
            {fill.stops.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <ColorField compact value={s.color} onChange={(color) => onChange({ ...fill, stops: fill.stops.map((x, j) => (j === i ? { ...x, color } : x)) }, `stop${i}c`)} />
                <input
                  type="range"
                  className="tz-range flex-1"
                  min={0}
                  max={1}
                  step={0.01}
                  value={s.pos}
                  style={{ "--pct": `${s.pos * 100}%` } as React.CSSProperties}
                  onChange={(e) => onChange({ ...fill, stops: fill.stops.map((x, j) => (j === i ? { ...x, pos: Number(e.target.value) } : x)) }, `stop${i}`)}
                />
                <button
                  disabled={fill.stops.length <= 2}
                  onClick={() => onChange({ ...fill, stops: fill.stops.filter((_, j) => j !== i) })}
                  className="rounded p-1 text-zinc-500 hover:bg-white/10 hover:text-zinc-200 disabled:opacity-30"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {fill.stops.length < 8 && (
              <button
                onClick={() => {
                  const last = fill.stops[fill.stops.length - 1];
                  onChange({ ...fill, stops: [...fill.stops, { color: last?.color ?? "#ffffff", pos: 1 }] });
                }}
                className="flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200"
              >
                <Plus size={13} /> Añadir color
              </button>
            )}
          </div>
          {fill.kind !== "radial" && (
            <Slider label="Ángulo" value={fill.angle} min={0} max={360} step={1} format={(v) => `${v}°`} onChange={(angle) => onChange({ ...fill, angle }, "angle")} />
          )}
          {fill.kind === "radial" && (
            <Slider label="Radio" value={fill.radius} min={0.1} max={2} onChange={(radius) => onChange({ ...fill, radius }, "radius")} />
          )}
        </>
      )}

      {fill.kind === "mesh" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <ColorField compact value={fill.base} onChange={(base) => onChange({ ...fill, base }, "base")} />
            <span>Color base</span>
          </div>
          {fill.points.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <ColorField compact value={p.color} onChange={(color) => onChange({ ...fill, points: fill.points.map((x, j) => (j === i ? { ...x, color } : x)) }, `pt${i}c`)} />
              <input
                type="range"
                title="Tamaño"
                className="tz-range flex-1"
                min={0.1}
                max={1.2}
                step={0.01}
                value={p.radius}
                style={{ "--pct": `${((p.radius - 0.1) / 1.1) * 100}%` } as React.CSSProperties}
                onChange={(e) => onChange({ ...fill, points: fill.points.map((x, j) => (j === i ? { ...x, radius: Number(e.target.value) } : x)) }, `pt${i}r`)}
              />
              <button onClick={() => onChange({ ...fill, points: fill.points.filter((_, j) => j !== i) })} className="rounded p-1 text-zinc-500 hover:bg-white/10 hover:text-zinc-200">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {fill.points.length < 8 && (
            <button
              onClick={() =>
                onChange({
                  ...fill,
                  points: [...fill.points, { x: Math.random(), y: Math.random(), radius: 0.5, color: PALETTES[Math.floor(Math.random() * PALETTES.length)].colors[2] }],
                })
              }
              className="flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200"
            >
              <Plus size={13} /> Añadir punto de color
            </button>
          )}
          <p className="text-[11px] leading-snug text-zinc-500">Arrastra los puntos sobre el lienzo para mover cada mancha de color.</p>
        </div>
      )}

      <div className="tz-scroll -m-1 flex gap-1.5 overflow-x-auto p-1 pb-2">
        {PALETTES.map((p) => (
          <button
            key={p.name}
            title={p.name}
            onClick={() => onChange(applyPalette(fill, p.colors))}
            className="flex h-5 w-12 shrink-0 overflow-hidden rounded-md ring-1 ring-white/10 transition hover:scale-105 hover:ring-white/40"
          >
            {p.colors.map((c) => (
              <span key={c} className="flex-1" style={{ background: c }} />
            ))}
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

import { Download, Moon, Plus, Sun, X } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { fillColors } from "@/lib/render/fill";
import { assetsReady, preloadAssets } from "@/lib/render/assets";
import { renderWallpaper } from "@/lib/render";
import { SCENE_PRESETS, type SceneKind, addScene, exitDynamic, removeScene, sceneAtHour, switchScene, syncScenes } from "@/lib/scenes";
import type { Editor } from "@/lib/store";
import type { Fill, Layer, Scene } from "@/lib/types";
import { getPlatform } from "@/lib/platform";
import { Button, Popover, Segmented, cx } from "./ui";

const SceneThumb = memo(function SceneThumb({ background, layers, width, height }: { background: Fill; layers: Layer[]; width: number; height: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const h = 64;
  const w = Math.round((h * width) / height);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const doc = { width: w * 2, height: h * 2, background, layers };
    const draw = () => {
      c.width = w * 2;
      c.height = h * 2;
      const ctx = c.getContext("2d");
      if (ctx) renderWallpaper(ctx, doc, c.width, c.height);
    };
    draw();
    if (!assetsReady(doc)) preloadAssets(doc).then(draw);
  }, [background, layers, w]);
  return <canvas ref={ref} style={{ width: w, height: h }} className="block rounded-md" />;
});

const fmtHour = (h: number) => `${String(Math.floor(h) % 24).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
const HOURS = Array.from({ length: 96 }, (_, i) => fmtHour(i / 4));
const parseHour = (v: string) => {
  const [hh, mm] = v.split(":").map(Number);
  return (hh || 0) + (mm || 0) / 60;
};

export function ScenesBar({ editor, onExport }: { editor: Editor; onExport: () => void }) {
  const { doc } = editor;
  const [menu, setMenu] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  if (!doc.scenes) return null;

  const scenes = syncScenes(doc);
  const active = doc.activeScene ?? 0;
  const mode = doc.dynamicMode ?? "appearance";

  const setSceneMeta = (i: number, patch: Partial<Scene>, key?: string) =>
    editor.setDoc((d) => ({ ...d, scenes: d.scenes?.map((s, j) => (j === i ? { ...s, ...patch } : s)) }), key && `scene${i}:${key}`);

  const onTrackMove = (e: React.PointerEvent) => {
    if (dragging == null || !trackRef.current) return;
    const r = trackRef.current.getBoundingClientRect();
    const hour = Math.round(Math.min(23.75, Math.max(0, ((e.clientX - r.left) / r.width) * 24)) * 4) / 4;
    setSceneMeta(dragging, { hour }, "hour");
  };

  // Segments of the day covered by each scene (time mode).
  const sorted = scenes.map((s, i) => ({ s, i })).sort((a, b) => a.s.hour - b.s.hour);
  const segments = sorted.map((x, k) => ({ ...x, from: x.s.hour, to: k + 1 < sorted.length ? sorted[k + 1].s.hour : 24 }));
  if (sorted.length && sorted[0].s.hour > 0) segments.unshift({ ...sorted[sorted.length - 1], from: 0, to: sorted[0].s.hour });
  const nowHour = new Date().getHours() + new Date().getMinutes() / 60;

  return (
    <div className="shrink-0 border-t border-white/5 bg-zinc-900/70 px-4 py-3">
      <div className="mb-3 flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <Sun size={15} className="text-amber-300" />
          <Moon size={15} className="-ml-1 text-indigo-300" />
          Wallpaper dinámico
        </div>
        <div className="order-last w-full sm:order-none sm:w-72">
          <Segmented
            value={mode}
            onChange={(dynamicMode) => editor.setDoc((d) => ({ ...d, dynamicMode }))}
            options={[
              { value: "appearance", label: "Modo claro / oscuro", title: "Cambia cuando el sistema pasa a modo oscuro" },
              { value: "time", label: "Según la hora", title: "Cambia a lo largo del día" },
            ]}
          />
        </div>
        <div className="flex-1" />
        <Button onClick={() => editor.setDoc(exitDynamic)} title="Conserva solo la escena actual">
          Quitar dinámico
        </Button>
        <Button variant="primary" onClick={onExport}>
          <Download size={14} /> {getPlatform() === "mac" ? ".heic para Mac" : "Descargar escenas"}
        </Button>
      </div>

      <div className="flex items-stretch gap-2">
      <div className="tz-scroll -ml-2 -mt-2 flex min-w-0 items-stretch gap-2 overflow-x-auto pb-1.5 pl-2 pr-1 pt-2">
        {scenes.map((s, i) => (
          <div
            key={s.id}
            onClick={() => i !== active && editor.setDoc((d) => switchScene(d, i))}
            className={cx(
              "group relative flex shrink-0 cursor-pointer gap-2.5 rounded-xl p-1.5 pr-3 ring-1 transition",
              i === active ? "bg-violet-500/15 ring-violet-400/50" : "bg-white/3 ring-white/5 hover:bg-white/6",
            )}
          >
            <SceneThumb background={s.background} layers={s.layers} width={doc.width} height={doc.height} />
            <div className="flex w-28 flex-col justify-between py-0.5">
              <input
                value={s.name}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setSceneMeta(i, { name: e.target.value }, "name")}
                className="w-full bg-transparent text-[13px] font-medium text-zinc-100 outline-none"
              />
              {mode === "appearance" ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSceneMeta(i, { appearance: s.appearance === "light" ? "dark" : "light" });
                  }}
                  className={cx(
                    "flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ring-1",
                    s.appearance === "light" ? "bg-amber-400/10 text-amber-200 ring-amber-300/30" : "bg-indigo-400/10 text-indigo-200 ring-indigo-300/30",
                  )}
                >
                  {s.appearance === "light" ? <Sun size={11} /> : <Moon size={11} />}
                  {s.appearance === "light" ? "Claro" : "Oscuro"}
                </button>
              ) : (
                <select
                  value={fmtHour(s.hour)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setSceneMeta(i, { hour: parseHour(e.target.value) })}
                  className="tz-input w-full cursor-pointer px-1.5 py-0.5 font-mono"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      🕒 {h}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {scenes.length > 1 && (
              <button
                title="Eliminar escena"
                onClick={(e) => {
                  e.stopPropagation();
                  editor.setDoc((d) => removeScene(d, i));
                }}
                className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 ring-1 ring-white/20 hover:text-white group-hover:flex pointer-coarse:flex"
              >
                <X size={11} />
              </button>
            )}
          </div>
        ))}
      </div>

        <div className="relative shrink-0 pb-1.5">
          <button
            onClick={() => setMenu(true)}
            className="flex h-full min-h-[76px] w-24 flex-col items-center justify-center gap-1 rounded-xl text-xs text-zinc-400 ring-1 ring-dashed ring-white/15 transition hover:bg-white/5 hover:text-white"
          >
            <Plus size={16} /> Escena
          </button>
          <Popover open={menu} onClose={() => setMenu(false)} className="bottom-full right-0 mb-2 w-60">
            <p className="px-2 pb-1.5 pt-1 text-[11px] text-zinc-500">Se genera a partir de tu escena de día:</p>
            {(Object.keys(SCENE_PRESETS) as SceneKind[]).map((k) => (
              <button
                key={k}
                onClick={() => {
                  editor.setDoc((d) => addScene(d, k));
                  setMenu(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm text-zinc-200 hover:bg-white/8"
              >
                <span className="text-base">{SCENE_PRESETS[k].emoji}</span>
                {k === "copy" ? "Copia exacta" : `${SCENE_PRESETS[k].name} automático`}
              </button>
            ))}
          </Popover>
        </div>
      </div>

      {mode === "appearance" && (
        <p className="mt-2 truncate text-[11px] text-zinc-500">
          Se usa la primera escena ☀️ en modo claro y la primera 🌙 en modo oscuro (en Mac, también al anochecer con “Automático”).
        </p>
      )}

      {mode === "time" && (
        <div className="mt-3 select-none" onPointerMove={onTrackMove} onPointerUp={() => setDragging(null)} onPointerCancel={() => setDragging(null)}>
          <div ref={trackRef} className="relative h-6 overflow-visible rounded-full bg-black/30 ring-1 ring-white/10">
            {segments.map((seg, k) => (
              <div
                key={k}
                className={cx("absolute inset-y-0 opacity-70", seg.i === active && "opacity-100")}
                style={{
                  left: `${(seg.from / 24) * 100}%`,
                  width: `${((seg.to - seg.from) / 24) * 100}%`,
                  background: `linear-gradient(90deg, ${fillColors(seg.s.background).slice(0, 3).join(",")})`,
                  borderRadius: seg.from === 0 ? "999px 0 0 999px" : seg.to === 24 ? "0 999px 999px 0" : 0,
                }}
              />
            ))}
            <div className="absolute inset-y-[-4px] w-px bg-white/70" style={{ left: `${(nowHour / 24) * 100}%` }} title="Ahora" />
            {scenes.map((s, i) => (
              <button
                key={s.id}
                onPointerDown={(e) => {
                  e.preventDefault();
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  setDragging(i);
                  if (i !== active) editor.setDoc((d) => switchScene(d, i));
                }}
                className="absolute top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center gap-1 whitespace-nowrap rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] text-white shadow-lg ring-1 ring-white/30 hover:ring-white/70"
                style={{ left: `${(s.hour / 24) * 100}%` }}
              >
                {s.name} · {fmtHour(s.hour)}
              </button>
            ))}
          </div>
          <div className="mt-1 flex justify-between px-0.5 font-mono text-[10px] text-zinc-600">
            {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => (
              <span key={h}>{String(h).padStart(2, "0")}h</span>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">Arrastra los marcadores para cambiar la hora de cada escena. Ahora ({fmtHour(nowHour)}) macOS mostraría: <b className="text-zinc-300">{scenes[sceneAtHour(scenes, nowHour)]?.name}</b></p>
        </div>
      )}
    </div>
  );
}

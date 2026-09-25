"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { assetsReady, preloadAssets } from "@/lib/render/assets";
import { Pause, Play } from "lucide-react";
import { loopOf, renderWallpaper } from "@/lib/render";
import { docIsAnimated } from "@/lib/render/motion";
import type { WallpaperDoc } from "@/lib/types";
import { cx } from "./ui";

export interface Handle {
  id: string;
  x: number; // 0..1
  y: number; // 0..1
  color?: string;
  label?: string;
}

const LOOPS = [4, 6, 8, 10, 15, 20, 30];

export function Preview({
  doc,
  handles,
  onHandleMove,
  onLoopChange,
}: {
  doc: WallpaperDoc;
  handles: Handle[];
  onHandleMove: (id: string, x: number, y: number) => void;
  onLoopChange: (seconds: number) => void;
}) {
  const animated = !!docIsAnimated(doc);
  const [playing, setPlaying] = useState(true);
  const timeRef = useRef(0);
  const progressRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [dragging, setDragging] = useState<string | null>(null);
  const [, setLoadedTick] = useState(0);
  const loading = !assetsReady(doc);

  // Fit the wallpaper's aspect ratio into the stage.
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const fit = () => {
      const pad = 48;
      const aw = el.clientWidth - pad * 2;
      const ah = el.clientHeight - pad * 2;
      const r = doc.width / doc.height;
      const w = Math.max(50, Math.min(aw, ah * r));
      setBox({ w, h: w / r });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [doc.width, doc.height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !box.w) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.round(box.w * dpr);
    const H = Math.round(box.h * dpr);
    let cancelled = false;
    let raf = 0;
    const loop = loopOf(doc);
    const draw = () => {
      if (cancelled) return;
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }
      const ctx = canvas.getContext("2d");
      if (ctx) renderWallpaper(ctx, doc, W, H, animated ? timeRef.current : 0);
      if (progressRef.current) progressRef.current.style.width = `${((timeRef.current % loop) / loop) * 100}%`;
    };
    if (animated && playing) {
      // Continue from where we were so edits don't restart the loop.
      const start = performance.now() - timeRef.current * 1000;
      const tick = (now: number) => {
        timeRef.current = ((now - start) / 1000) % loop;
        draw();
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    } else {
      raf = requestAnimationFrame(draw);
    }
    if (!assetsReady(doc)) {
      preloadAssets(doc).then(() => {
        if (cancelled) return;
        setLoadedTick((t) => t + 1);
        requestAnimationFrame(draw);
      });
    }
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [doc, box, animated, playing]);

  const toRel = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const startDrag = (id: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(id);
    const p = toRel(e);
    onHandleMove(id, p.x, p.y);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const p = toRel(e);
    onHandleMove(dragging, p.x, p.y);
  };

  const single = handles.length === 1 ? handles[0] : null;

  return (
    <div ref={stageRef} className="tz-stage relative flex h-full w-full items-center justify-center overflow-hidden">
      <div
        className="tz-checker relative rounded-md shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/10"
        style={{ width: box.w, height: box.h }}
        onPointerMove={onMove}
        onPointerUp={() => setDragging(null)}
        onPointerCancel={() => setDragging(null)}
      >
        <canvas
          ref={canvasRef}
          className={cx("block h-full w-full rounded-md", single && "cursor-move")}
          onPointerDown={(e) => single && startDrag(single.id, e)}
        />
        {handles.map((h) => (
          <button
            key={h.id}
            title={h.label}
            onPointerDown={(e) => startDrag(h.id, e)}
            className={cx(
              "group absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.5)] transition-[width,height]",
              dragging === h.id ? "h-6 w-6 cursor-grabbing" : "h-4 w-4 hover:h-5 hover:w-5",
            )}
            style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%`, background: h.color ?? "rgba(139,92,246,0.9)" }}
          >
            {h.label && (
              <span className="pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                {h.label}
              </span>
            )}
          </button>
        ))}
        {loading && (
          <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-[10px] text-zinc-300 backdrop-blur">Cargando recursos…</div>
        )}
      </div>
      {animated && (
        <div className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-full bg-black/50 py-1 pl-1 pr-3 text-[11px] text-zinc-300 ring-1 ring-white/10 backdrop-blur">
          <button
            onClick={() => setPlaying(!playing)}
            className="grid h-6 w-6 place-items-center rounded-full bg-white text-zinc-900 transition hover:scale-105"
            title={playing ? "Pausar" : "Reproducir"}
          >
            {playing ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
          </button>
          <div className="h-1 w-20 overflow-hidden rounded-full bg-white/15">
            <div ref={progressRef} className="h-full bg-violet-400" />
          </div>
          <span className="text-zinc-500">Loop</span>
          <select
            value={loopOf(doc)}
            onChange={(e) => onLoopChange(Number(e.target.value))}
            className="cursor-pointer bg-transparent font-mono text-zinc-200 outline-none"
          >
            {LOOPS.map((s) => (
              <option key={s} value={s} className="bg-zinc-900">
                {s}s
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 font-mono text-[11px] text-zinc-400 backdrop-blur">
        {doc.width} × {doc.height}
        {handles.length > 0 && <span className="ml-2 text-zinc-500">· arrastra para mover</span>}
      </div>
    </div>
  );
}

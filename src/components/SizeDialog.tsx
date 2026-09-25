"use client";

import { ArrowLeftRight, Monitor, Search } from "lucide-react";
import { useState } from "react";
import {
  ASPECT_RATIOS,
  DEVICE_GROUPS,
  LONG_SIDES,
  RESOLUTIONS,
  findResolution,
  ratioLabel,
  sizeFromRatio,
} from "@/lib/resolutions";
import { Button, Modal, Segmented, cx } from "./ui";

type Tab = "devices" | "ratio" | "custom";

function Shape({ w, h, active }: { w: number; h: number; active?: boolean }) {
  const max = 28;
  const s = max / Math.max(w, h);
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center">
      <span
        className={cx("block rounded-[3px] border-2 transition", active ? "border-violet-300 bg-violet-400/20" : "border-zinc-500 group-hover:border-zinc-300")}
        style={{ width: Math.max(6, w * s), height: Math.max(6, h * s) }}
      />
    </span>
  );
}

export function SizeDialog({
  open,
  onClose,
  width,
  height,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  width: number;
  height: number;
  onPick: (w: number, h: number) => void;
}) {
  const [tab, setTab] = useState<Tab>("devices");
  const [q, setQ] = useState("");
  const [ratio, setRatio] = useState(ASPECT_RATIOS[0]);
  const [long, setLong] = useState(3840);
  const [portrait, setPortrait] = useState(height > width);
  const [custom, setCustom] = useState({ w: String(width), h: String(height) });
  const current = findResolution(width, height);

  const pick = (w: number, h: number) => {
    onPick(w, h);
    onClose();
  };

  const myScreen = () => {
    const dpr = window.devicePixelRatio || 1;
    pick(Math.round(screen.width * dpr), Math.round(screen.height * dpr));
  };

  const needle = q.trim().toLowerCase();
  const devices = RESOLUTIONS.filter((r) => !needle || `${r.label} ${r.group} ${r.width}x${r.height}`.toLowerCase().includes(needle));
  const fromRatio = sizeFromRatio(ratio.w, ratio.h, long, portrait);
  const cw = Math.round(Number(custom.w));
  const ch = Math.round(Number(custom.h));
  const customOk = cw >= 100 && ch >= 100 && cw <= 10000 && ch <= 10000;

  return (
    <Modal open={open} onClose={onClose} title="Tamaño del lienzo" wide>
      <div className="flex flex-wrap items-center gap-3 border-b border-white/5 px-5 py-3">
        <div className="w-80">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "devices", label: "Dispositivos" },
              { value: "ratio", label: "Proporción" },
              { value: "custom", label: "Personalizado" },
            ]}
          />
        </div>
        <Button variant="soft" onClick={myScreen} title="Usa la resolución real de esta pantalla">
          <Monitor size={14} /> Mi pantalla
        </Button>
        <div className="flex-1" />
        <p className="font-mono text-xs text-zinc-500">
          Actual: {current?.label ?? "Personalizado"} · {width}×{height} · {ratioLabel(width, height)}
        </p>
      </div>

      {tab === "devices" && (
        <div className="p-5">
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input className="tz-input w-full pl-8 text-sm" placeholder="Buscar: iphone, macbook, 4k, pixel…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {DEVICE_GROUPS.map((g) => {
              const list = devices.filter((d) => d.group === g);
              if (!list.length) return null;
              return (
                <div key={g}>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{g}</p>
                  <div className="space-y-0.5">
                    {list.map((r) => {
                      const active = r.width === width && r.height === height;
                      return (
                        <button
                          key={r.id}
                          onClick={() => pick(r.width, r.height)}
                          className={cx("group flex w-full items-center gap-2.5 rounded-lg px-2 py-1 text-left transition", active ? "bg-violet-500/15 ring-1 ring-violet-400/40" : "hover:bg-white/5")}
                        >
                          <Shape w={r.width} h={r.height} active={active} />
                          <span className="min-w-0 flex-1">
                            <span className={cx("block truncate text-[13px]", active ? "text-white" : "text-zinc-200")}>{r.label}</span>
                            <span className="block font-mono text-[10px] text-zinc-500">
                              {r.width}×{r.height} · {ratioLabel(r.width, r.height)}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {!devices.length && <p className="py-8 text-center text-sm text-zinc-500">Nada con “{q}”. Prueba con la pestaña Personalizado.</p>}
        </div>
      )}

      {tab === "ratio" && (
        <div className="space-y-5 p-5">
          <div className="grid grid-cols-5 gap-2">
            {ASPECT_RATIOS.map((a) => {
              const active = a.label === ratio.label;
              const [w, h] = portrait ? [a.h, a.w] : [a.w, a.h];
              return (
                <button
                  key={a.label}
                  onClick={() => setRatio(a)}
                  className={cx("group flex flex-col items-center gap-1 rounded-xl p-3 ring-1 transition", active ? "bg-violet-500/15 ring-violet-400/50" : "ring-white/5 hover:bg-white/5")}
                >
                  <span className="flex h-12 items-center">
                    <span
                      className={cx("block rounded border-2", active ? "border-violet-300 bg-violet-400/20" : "border-zinc-500")}
                      style={{ width: (44 * w) / Math.max(w, h), height: (44 * h) / Math.max(w, h) }}
                    />
                  </span>
                  <span className="text-sm font-semibold text-zinc-100">{portrait ? `${a.h}:${a.w}` : a.label}</span>
                  <span className="text-[10px] text-zinc-500">{a.hint}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-72">
              <Segmented value={String(long)} onChange={(v) => setLong(Number(v))} options={LONG_SIDES.map((s) => ({ value: String(s.px), label: s.label }))} />
            </div>
            <Button variant="soft" onClick={() => setPortrait(!portrait)}>
              <ArrowLeftRight size={14} /> {portrait ? "Vertical" : "Horizontal"}
            </Button>
            <div className="flex-1" />
            <p className="font-mono text-sm text-zinc-300">
              {fromRatio.width} × {fromRatio.height}
            </p>
            <Button variant="primary" onClick={() => pick(fromRatio.width, fromRatio.height)}>
              Usar
            </Button>
          </div>
        </div>
      )}

      {tab === "custom" && (
        <div className="flex flex-wrap items-end gap-3 p-5">
          <label className="text-xs text-zinc-400">
            Ancho (px)
            <input className="tz-input mt-1 block w-32 font-mono text-sm" value={custom.w} onChange={(e) => setCustom({ ...custom, w: e.target.value })} />
          </label>
          <button onClick={() => setCustom({ w: custom.h, h: custom.w })} className="mb-1.5 rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white" title="Intercambiar">
            <ArrowLeftRight size={16} />
          </button>
          <label className="text-xs text-zinc-400">
            Alto (px)
            <input className="tz-input mt-1 block w-32 font-mono text-sm" value={custom.h} onChange={(e) => setCustom({ ...custom, h: e.target.value })} />
          </label>
          <Button variant="primary" className="mb-0.5" disabled={!customOk} onClick={() => pick(cw, ch)}>
            Usar
          </Button>
          <p className="w-full text-xs text-zinc-500">
            {customOk ? `Proporción ${ratioLabel(cw, ch)} · ${((cw * ch) / 1e6).toFixed(1)} MP` : "Usa medidas entre 100 y 10000 px."}
          </p>
        </div>
      )}
    </Modal>
  );
}

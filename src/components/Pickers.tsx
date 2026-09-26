"use client";

import { createElement, useEffect, useMemo, useState } from "react";
import { EMOJI_CATEGORIES, ICON_CATEGORIES } from "@/lib/catalog";
import { getIconNames, getIconNode, loadIcons } from "@/lib/render/assets";
import { cx } from "./ui";

export function IconSvg({ name, size = 20, strokeWidth = 2 }: { name: string; size?: number; strokeWidth?: number }) {
  const node = getIconNode(name);
  if (!node) return <span style={{ width: size, height: size }} className="inline-block" />;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {node.map(([tag, attrs], i) => createElement(tag, { ...attrs, key: i }))}
    </svg>
  );
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "shrink-0 rounded-full px-2.5 py-1 text-[11px] transition",
        active ? "bg-violet-500/25 text-violet-100 ring-1 ring-violet-400/50" : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200",
      )}
    >
      {children}
    </button>
  );
}

export function EmojiPicker({ selected, onChange, initialCategory }: { selected: string[]; onChange: (chars: string[]) => void; initialCategory?: string }) {
  const [cat, setCat] = useState(initialCategory ?? EMOJI_CATEGORIES[0].name);
  const [custom, setCustom] = useState("");
  const list = EMOJI_CATEGORIES.find((c) => c.name === cat)?.emojis ?? [];
  const toggle = (e: string) => onChange(selected.includes(e) ? selected.filter((x) => x !== e) : [...selected, e]);

  const addCustom = () => {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const chars = [...seg.segment(custom)].map((s) => s.segment).filter((s) => s.trim() && /\p{Extended_Pictographic}/u.test(s));
    if (chars.length) onChange([...new Set([...selected, ...chars])]);
    setCustom("");
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {selected.map((e) => (
          <button key={e} onClick={() => toggle(e)} title="Quitar" className="group relative rounded-lg bg-violet-500/20 p-1 text-xl ring-1 ring-violet-400/40">
            {e}
            <span className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-[10px] text-zinc-300 ring-1 ring-white/20 group-hover:flex pointer-coarse:flex">×</span>
          </button>
        ))}
        {!selected.length && <p className="text-xs text-zinc-500">Elige uno o varios emojis abajo.</p>}
      </div>
      <div className="tz-scroll -m-1 flex gap-1.5 overflow-x-auto p-1 pb-2">
        {EMOJI_CATEGORIES.map((c) => (
          <Chip key={c.name} active={c.name === cat} onClick={() => setCat(c.name)}>
            {c.name}
          </Chip>
        ))}
      </div>
      <div className="tz-scroll grid max-h-48 grid-cols-8 gap-0.5 overflow-y-auto rounded-lg bg-black/20 p-1.5">
        {list.map((e) => (
          <button
            key={e}
            onClick={() => toggle(e)}
            className={cx("rounded-md p-1 text-xl transition hover:scale-110 hover:bg-white/10", selected.includes(e) && "bg-violet-500/30")}
          >
            {e}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          className="tz-input flex-1"
          placeholder="Pega cualquier emoji… 🫶🌮"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCustom()}
        />
        <button onClick={addCustom} className="rounded-lg bg-white/8 px-3 text-xs text-zinc-200 hover:bg-white/15">
          Añadir
        </button>
      </div>
    </div>
  );
}

export function IconPicker({ selected, onChange, initialCategory }: { selected: string[]; onChange: (icons: string[]) => void; initialCategory?: string }) {
  const [ready, setReady] = useState(!!getIconNames().length);
  const [cat, setCat] = useState<string>(initialCategory ?? ICON_CATEGORIES[0].name);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!ready) loadIcons().then(() => setReady(true));
  }, [ready]);

  const list = useMemo(() => {
    if (!ready) return [];
    const all = getIconNames();
    if (q.trim()) {
      const needle = q.trim().toLowerCase().replace(/[\s-]/g, "");
      return all.filter((n) => n.toLowerCase().includes(needle)).slice(0, 160);
    }
    const names = ICON_CATEGORIES.find((c) => c.name === cat)?.icons ?? [];
    return [...new Set(names)].filter((n) => getIconNode(n));
  }, [ready, q, cat]);

  const toggle = (n: string) => onChange(selected.includes(n) ? selected.filter((x) => x !== n) : [...selected, n]);

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {selected.map((n) => (
          <button key={n} onClick={() => toggle(n)} title={`Quitar ${n}`} className="rounded-lg bg-violet-500/20 p-1.5 text-violet-100 ring-1 ring-violet-400/40">
            <IconSvg name={n} size={18} />
          </button>
        ))}
        {!selected.length && <p className="text-xs text-zinc-500">Elige uno o varios íconos.</p>}
      </div>
      <input className="tz-input w-full" placeholder={`Buscar entre ${getIconNames().length || "2000+"} íconos (en inglés: cat, rocket…)`} value={q} onChange={(e) => setQ(e.target.value)} />
      {!q && (
        <div className="tz-scroll -m-1 flex gap-1.5 overflow-x-auto p-1 pb-2">
          {ICON_CATEGORIES.map((c) => (
            <Chip key={c.name} active={c.name === cat} onClick={() => setCat(c.name)}>
              {c.name}
            </Chip>
          ))}
        </div>
      )}
      <div className="tz-scroll grid max-h-52 grid-cols-8 gap-0.5 overflow-y-auto rounded-lg bg-black/20 p-1.5">
        {!ready && <p className="col-span-8 p-3 text-center text-xs text-zinc-500">Cargando íconos…</p>}
        {list.map((n) => (
          <button
            key={n}
            title={n}
            onClick={() => toggle(n)}
            className={cx("flex items-center justify-center rounded-md p-1.5 text-zinc-300 transition hover:bg-white/10 hover:text-white", selected.includes(n) && "bg-violet-500/30 text-white")}
          >
            <IconSvg name={n} size={18} />
          </button>
        ))}
        {ready && !list.length && <p className="col-span-8 p-3 text-center text-xs text-zinc-500">Sin resultados</p>}
      </div>
    </div>
  );
}

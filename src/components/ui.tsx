"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { isHex } from "@/lib/color";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="border-b border-white/5 px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{title}</h3>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>{label}</span>
        {hint != null && <span className="font-mono text-[11px] text-zinc-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <Field label={label} hint={format ? format(value) : Number(value.toFixed(2))}>
      <input
        type="range"
        className="tz-range w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ "--pct": `${Math.max(0, Math.min(100, pct))}%` } as React.CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}

export function ColorField({ value, onChange, label, compact }: { value: string; onChange: (v: string) => void; label?: string; compact?: boolean }) {
  const hex6 = value.slice(0, 7);
  // Local text while typing; resets whenever the outside value changes.
  const [edit, setEdit] = useState({ base: hex6, text: hex6 });
  const draft = edit.base === hex6 ? edit.text : hex6;
  const setDraft = (text: string) => setEdit({ base: hex6, text });
  const swatch = (
    <label
      className="relative block h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-1 ring-white/15 transition hover:ring-white/40"
      style={{ background: value }}
    >
      <input type="color" className="absolute inset-0 cursor-pointer opacity-0" value={isHex(hex6) ? hex6 : "#000000"} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
  if (compact) return swatch;
  const body = (
    <div className="flex items-center gap-2">
      {swatch}
      <input
        className="tz-input w-full font-mono uppercase"
        value={draft}
        onChange={(e) => {
          const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
          setDraft(v);
          if (isHex(v)) onChange(v);
        }}
      />
    </div>
  );
  return label ? <Field label={label}>{body}</Field> : body;
}

export function Select<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; group?: string }[];
  onChange: (v: T) => void;
  label?: string;
}) {
  const groups = [...new Set(options.map((o) => o.group))];
  const el = (
    <select
      className="tz-input w-full cursor-pointer"
      value={String(value)}
      onChange={(e) => {
        const o = options.find((o) => String(o.value) === e.target.value);
        if (o) onChange(o.value);
      }}
    >
      {groups.map((g) =>
        g ? (
          <optgroup key={g} label={g}>
            {options.filter((o) => o.group === g).map((o) => (
              <option key={String(o.value)} value={String(o.value)}>
                {o.label}
              </option>
            ))}
          </optgroup>
        ) : (
          options.filter((o) => !o.group).map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label}
            </option>
          ))
        ),
      )}
    </select>
  );
  return label ? <Field label={label}>{el}</Field> : el;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  label?: string;
}) {
  const el = (
    <div className="flex rounded-lg bg-black/30 p-0.5 ring-1 ring-white/5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cx(
            "flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs transition",
            o.value === value ? "bg-white/12 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
  return label ? <Field label={label}>{el}</Field> : el;
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between text-xs text-zinc-400">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx("relative h-5 w-9 rounded-full transition", checked ? "bg-violet-500" : "bg-white/10")}
      >
        <span className={cx("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", checked ? "left-4.5" : "left-0.5")} />
      </button>
    </label>
  );
}

export function Button({
  children,
  onClick,
  variant = "ghost",
  className,
  disabled,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "ghost" | "primary" | "soft";
  className?: string;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
        variant === "primary" && "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/20 hover:brightness-110",
        variant === "soft" && "bg-white/8 text-zinc-100 ring-1 ring-white/10 hover:bg-white/12",
        variant === "ghost" && "text-zinc-300 hover:bg-white/8 hover:text-white",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Closes on Escape or on any pointer-down outside its wrapper (the positioned parent that also holds the trigger). */
export function Popover({ open, onClose, children, className }: { open: boolean; onClose: () => void; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onDown = (e: PointerEvent) => {
      const scope = ref.current?.parentElement ?? ref.current;
      if (scope && !scope.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div ref={ref} className={cx("absolute z-50 rounded-xl border border-white/10 bg-zinc-900/95 p-2 shadow-2xl backdrop-blur-xl", className)}>
      {children}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm sm:p-4"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={cx("flex max-h-[92dvh] w-full flex-col sm:max-h-[88vh] overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl", wide ? "max-w-5xl" : "max-w-lg")}>
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="rounded-md px-2 text-lg leading-none text-zinc-500 hover:bg-white/10 hover:text-white">
            ×
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

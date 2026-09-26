"use client";

import {
  Bookmark,
  Clapperboard,
  Dices,
  Download,
  Image as ImageIcon,
  Layers,
  LayoutTemplate,
  Monitor,
  Moon,
  MousePointer2,
  Palette,
  Sparkles,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { renderWallpaper } from "@/lib/render";
import { preloadAssets } from "@/lib/render/assets";
import { type Platform, animatedHowTo, getPlatform, key } from "@/lib/platform";
import { TEMPLATES, buildTemplate } from "@/lib/templates";
import { cx } from "./ui";

export const WELCOME_KEY = "tapiz:welcome:v1";

export type HelpAction = "templates" | "surprise" | "daynight" | "photos" | "export" | "size" | "saved" | "add";

interface Feature {
  icon: LucideIcon;
  color: string;
  title: string;
  text: string;
  action?: { label: string; id: HelpAction };
}

function features(p: Platform): Feature[] {
  const live = animatedHowTo(p);
  return [
  {
    icon: Layers,
    color: "text-sky-300",
    title: "Arma por capas",
    text: "Degradados y mesh, formas, emojis, animales, +2000 íconos, patrones, texturas y texto. Cada capa va una vez, esparcida o en mosaico.",
    action: { label: "Añadir capa", id: "add" },
  },
  {
    icon: MousePointer2,
    color: "text-violet-300",
    title: "Arrastra en el lienzo",
    text: "Mueve la capa seleccionada con el mouse o el dedo. En un fondo mesh, arrastra cada punto de color; en radial/cónico, su centro.",
  },
  {
    icon: LayoutTemplate,
    color: "text-emerald-300",
    title: "Plantillas editables",
    text: "Estáticas, animadas y de día/noche. Son ideas de partida: recoloréalas antes de abrirlas y cambia lo que quieras.",
    action: { label: "Ver plantillas", id: "templates" },
  },
  {
    icon: Dices,
    color: "text-amber-300",
    title: "Sorpréndeme, remix y barajar",
    text: "Un diseño al azar (tecla Espacio), otra paleta para todo el diseño manteniendo luces y sombras, o redistribuir los elementos.",
    action: { label: "Sorpréndeme", id: "surprise" },
  },
  {
    icon: ImageIcon,
    color: "text-rose-300",
    title: "Tus fotos",
    text: `Súbelas, pégalas con ${key("V", false, p)}, arrástralas o trae una por link. De fondo completo o como elementos con marco polaroid, círculo, arco…`,
    action: { label: "Añadir fotos", id: "photos" },
  },
  {
    icon: Sun,
    color: "text-indigo-300",
    title: "Día / Noche",
    text:
      p === "mac"
        ? "Crea escenas (día, atardecer, noche…) que cambian con el modo oscuro o la hora. Se descarga como .heic dinámico nativo de macOS."
        : "Crea escenas (día, atardecer, noche…) y descárgalas como imágenes. En Mac además se arma un .heic que cambia solo; el link en vivo también cambia de escena con el modo oscuro o la hora.",
    action: { label: "Activar día/noche", id: "daynight" },
  },
  {
    icon: Clapperboard,
    color: "text-cyan-300",
    title: "Animado",
    text: `Deriva, flotar, girar, latir, parpadeo, terreno que se transforma… Loop sin corte en MP4${
      live ? ` o link en vivo para ${live.app}` : " para apps de fondos en video"
    }.`,
  },
  {
    icon: Monitor,
    color: "text-fuchsia-300",
    title: "Cualquier pantalla",
    text: "+40 dispositivos, proporciones de HD a 8K o tu pantalla exacta. El diseño se adapta solo a cada tamaño.",
    action: { label: "Elegir tamaño", id: "size" },
  },
  {
    icon: Download,
    color: "text-lime-300",
    title: "Descarga en alta calidad",
    text: "PNG, JPG o WebP renderizados vectorialmente a tamaño real, o un pack para varios dispositivos de una vez.",
    action: { label: "Descargar", id: "export" },
  },
  {
    icon: Bookmark,
    color: "text-orange-300",
    title: "Guarda y comparte",
    text: "Tu diseño se guarda solo. Guarda versiones en “Mis diseños” o copia un link para compartirlo (tus fotos no viajan en el link).",
    action: { label: "Mis diseños", id: "saved" },
  },
  ];
}

const shortcuts = (p: Platform): [string, string][] => [
  ["Espacio", "Sorpréndeme"],
  [`${key("Z", false, p)} / ${key("Z", true, p)}`, "Deshacer / rehacer"],
  [key("D", false, p), "Duplicar capa"],
  [p === "mac" ? "Supr / ⌫" : "Supr", "Borrar capa"],
  [key("V", false, p), "Pegar foto o link"],
  [key("E", false, p), "Descargar"],
  ["?", "Esta ayuda"],
];

/** Small live-rendered wallpaper for the splash — the same engine as the editor. */
function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const t = TEMPLATES.find((x) => x.id === "live-aurora") ?? TEMPLATES[0];
    const design = buildTemplate(t);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(canvas.clientWidth * dpr);
    const H = Math.round(canvas.clientHeight * dpr);
    canvas.width = W;
    canvas.height = H;
    const doc = { width: W, height: H, ...design };
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let alive = true;
    const start = performance.now();
    const frame = (now: number) => {
      if (!alive) return;
      renderWallpaper(ctx, doc, W, H, (now - start) / 1000);
      raf = requestAnimationFrame(frame);
    };
    preloadAssets(doc).then(() => (raf = requestAnimationFrame(frame)));
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}

export function HelpDialog({ open, onClose, onAction, firstRun }: { open: boolean; onClose: () => void; onAction: (a: HelpAction) => void; firstRun: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  const platform = getPlatform();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl">
        <div className="tz-scroll overflow-y-auto">
          {/* Splash */}
          <div className="relative h-56 overflow-hidden sm:h-64">
            <HeroCanvas />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/30 to-transparent" />
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute right-3 top-3 rounded-full bg-black/40 px-2.5 py-0.5 text-lg text-white/80 backdrop-blur hover:bg-black/60 hover:text-white"
            >
              ×
            </button>
            <div className="absolute bottom-5 left-6 right-6">
              <div className="mb-2 flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[conic-gradient(from_180deg,#f72585,#7b2ff7,#2de2e6,#feca57,#f72585)] shadow-lg">
                  <div className="h-4 w-4 rounded bg-zinc-950/70" />
                </div>
                <p className="text-2xl font-bold tracking-tight text-white">{firstRun ? "Bienvenido a Tapiz" : "Cómo usar Tapiz"}</p>
              </div>
              <p className="max-w-xl text-sm text-zinc-300">
                Tu estudio de wallpapers: combina colores, texturas, patrones, animales, emojis, íconos y tus fotos, y descárgalo nítido en cualquier pantalla —
                incluso como fondo de día/noche o animado{platform === "mac" ? " para tu Mac" : platform === "windows" ? " para tu PC" : ""}.
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {features(platform).map((f) => (
              <div key={f.title} className="flex flex-col rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/5 transition hover:bg-white/[0.05]">
                <div className="mb-1.5 flex items-center gap-2">
                  <f.icon size={16} className={f.color} />
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  {f.title.startsWith("Día") && <Moon size={14} className="-ml-1 text-indigo-300" />}
                </div>
                <p className="flex-1 text-xs leading-relaxed text-zinc-400">{f.text}</p>
                {f.action && (
                  <button
                    onClick={() => onAction(f.action!.id)}
                    className="mt-3 w-fit rounded-lg bg-white/8 px-2.5 py-1 text-xs font-medium text-zinc-100 ring-1 ring-white/10 transition hover:bg-violet-500/20 hover:ring-violet-400/40"
                  >
                    {f.action.label} →
                  </button>
                )}
              </div>
            ))}
            <div className="rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 p-4 ring-1 ring-violet-400/20 sm:col-span-2 lg:col-span-2">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles size={16} className="text-violet-300" />
                <p className="text-sm font-semibold text-white">Atajos</p>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
                {shortcuts(platform).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 text-xs text-zinc-400">
                    <kbd className="rounded-md bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-zinc-200 ring-1 ring-white/10">{k}</kbd>
                    {v}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-3 border-t border-white/5 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <Palette size={12} /> Todo se genera en tu navegador. Vuelve a esta guía con el botón <b className="text-zinc-300">?</b> de arriba.
          </p>
          <button
            onClick={onClose}
            className={cx("shrink-0 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/20 hover:brightness-110")}
          >
            {firstRun ? "¡A crear! ✨" : "Entendido"}
          </button>
        </div>
      </div>
    </div>
  );
}

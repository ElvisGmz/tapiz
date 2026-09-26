"use client";

import { Check, Clapperboard, Copy, Download, Loader2, Moon, Sun, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { PALETTES } from "@/lib/catalog";
import {
  type ExportFormat,
  type VideoCodecChoice,
  canStreamToDisk,
  downloadBlob,
  estimateVideoMB,
  pickVideoFile,
  renderDynamicHeic,
  renderLoopVideo,
  renderThumb,
  renderToBlob,
} from "@/lib/export";
import { type Job, type JobKind, cancelJob, startJob, useJobs } from "@/lib/jobs";
import { loopOf } from "@/lib/render";
import { docIsAnimated } from "@/lib/render/motion";
import { makeShareUrl } from "@/lib/store";
import { canEncodeHeic } from "@/lib/heic";
import { uid } from "@/lib/random";
import { RESOLUTIONS, SAFARI_MAX_PIXELS } from "@/lib/resolutions";
import { type Editor, type SavedDesign, listSaved, writeSaved } from "@/lib/store";
import { type Design, TEMPLATES, buildTemplate, isAnimatedDesign, isDayNight, recolorDesign, type Template } from "@/lib/templates";
import type { WallpaperDoc } from "@/lib/types";
import { Button, Modal, Segmented, Slider, cx } from "./ui";

/* ---------- Templates ---------- */

const thumbCache = new Map<string, string>();
const designCache = new Map<string, Design>();

/** Built once per template+palette so the thumbnail and the loaded design share the same random layout. */
function templateDesign(t: Template, palette: string[] | null) {
  const key = `${t.id}:${palette?.join() ?? ""}`;
  let d = designCache.get(key);
  if (!d) {
    const base = buildTemplate(t);
    d = palette ? recolorDesign(base, palette) : base;
    designCache.set(key, d);
  }
  return d;
}

function useTemplateThumb(t: Template, palette: string[] | null, w: number, h: number, enabled: boolean, scene = 0) {
  const key = `${t.id}:${palette?.join() ?? ""}:${w}x${h}:${scene}`;
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!enabled || thumbCache.has(key)) return;
    let alive = true;
    const d = templateDesign(t, palette);
    const s = d.scenes?.[scene];
    renderThumb({ width: w, height: h, ...d, ...(s ? { background: s.background, layers: s.layers } : {}) }, 360).then((url) => {
      thumbCache.set(key, url);
      if (alive) setTick((n) => n + 1);
    });
    return () => {
      alive = false;
    };
  }, [key, enabled, t, palette, w, h, scene]);
  return thumbCache.get(key);
}

function TemplateCard({ t, palette, doc, onPick, enabled }: { t: Template; palette: string[] | null; doc: WallpaperDoc; onPick: (d: Design) => void; enabled: boolean }) {
  const design = templateDesign(t, palette);
  const dn = isDayNight(design);
  const nightIndex = dn ? Math.max(1, design.scenes!.findIndex((s) => s.appearance === "dark")) : 0;
  const src = useTemplateThumb(t, palette, doc.width, doc.height, enabled);
  const nightSrc = useTemplateThumb(t, palette, doc.width, doc.height, enabled && dn, nightIndex);
  return (
    <button onClick={() => onPick(structuredClone(templateDesign(t, palette)))} className="group text-left">
      <div
        className="relative overflow-hidden rounded-xl bg-zinc-800 ring-1 ring-white/10 transition group-hover:-translate-y-0.5 group-hover:ring-violet-400/60 group-hover:shadow-xl group-hover:shadow-violet-500/10"
        style={{ aspectRatio: `${doc.width} / ${doc.height}` }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={t.name} className="h-full w-full object-cover" />
        ) : null}
        {dn && nightSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={nightSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-[clip-path] duration-500 [clip-path:polygon(58%_0,100%_0,100%_100%,42%_100%)] group-hover:[clip-path:polygon(100%_0,100%_0,100%_100%,100%_100%)]"
          />
        ) : null}
        {!src && (
          <div className="flex h-full items-center justify-center">
            <Loader2 size={18} className="animate-spin text-zinc-600" />
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white/90 backdrop-blur">
          {dn ? "☀️🌙 " : isAnimatedDesign(design) ? "▶ " : ""}
          {t.tag}
        </span>
      </div>
      <p className="mt-1.5 text-xs font-medium text-zinc-300 group-hover:text-white">{t.name}</p>
    </button>
  );
}

type TemplateFilter = "all" | "animated" | "daynight" | "static";

export function TemplatesDialog({ open, onClose, editor }: { open: boolean; onClose: () => void; editor: Editor }) {
  const [paletteIdx, setPaletteIdx] = useState<number | null>(null);
  const [filter, setFilter] = useState<TemplateFilter>("all");
  const list = TEMPLATES.filter((t) => {
    if (filter === "all") return true;
    const d = templateDesign(t, null);
    if (filter === "daynight") return isDayNight(d);
    if (filter === "animated") return isAnimatedDesign(d) && !isDayNight(d);
    return !isAnimatedDesign(d) && !isDayNight(d);
  });
  const palette = paletteIdx == null ? null : PALETTES[paletteIdx].colors;
  return (
    <Modal open={open} onClose={onClose} title="Plantillas — todas 100% editables" wide>
      <div className="border-b border-white/5 px-5 py-3">
        <div className="mb-3 flex items-center gap-3">
          <div className="w-[28rem] shrink-0">
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "Todas" },
                { value: "animated", label: "▶ Animadas" },
                { value: "daynight", label: "☀️🌙 Día/noche" },
                { value: "static", label: "Estáticas" },
              ]}
            />
          </div>
          <p className="text-[11px] text-zinc-500">Son un punto de partida: cambia textos, colores, fotos y capas a tu gusto.</p>
        </div>
        <p className="mb-2 text-xs text-zinc-500">Colores de las plantillas</p>
        <div className="tz-scroll -m-1 flex gap-2 overflow-x-auto p-1 pb-2">
          <button
            onClick={() => setPaletteIdx(null)}
            className={cx("shrink-0 rounded-lg px-3 py-1 text-xs ring-1", paletteIdx == null ? "bg-violet-500/20 text-white ring-violet-400/50" : "text-zinc-400 ring-white/10 hover:text-white")}
          >
            Originales
          </button>
          {PALETTES.map((p, i) => (
            <button
              key={p.name}
              title={p.name}
              onClick={() => setPaletteIdx(i)}
              className={cx("flex h-7 w-16 shrink-0 overflow-hidden rounded-lg ring-2 transition", paletteIdx === i ? "ring-violet-400" : "ring-transparent hover:ring-white/30")}
            >
              {p.colors.map((c) => (
                <span key={c} className="flex-1" style={{ background: c }} />
              ))}
            </button>
          ))}
        </div>
      </div>
      <div className={cx("grid gap-4 p-5", editor.doc.width >= editor.doc.height ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-3 sm:grid-cols-5")}>
        {list.map((t) => (
          <TemplateCard
            key={t.id}
            t={t}
            palette={palette}
            doc={editor.doc}
            enabled={open}
            onPick={(d) => {
              // Templates replace the whole design, including scenes and motion.
              editor.loadDesign({ scenes: undefined, activeScene: undefined, dynamicMode: undefined, backgroundAnim: undefined, loop: undefined, ...d });
              onClose();
            }}
          />
        ))}
      </div>
    </Modal>
  );
}

/* ---------- Export ---------- */

const isSafari = () => typeof navigator !== "undefined" && /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);

/** Latest job of a kind, so a section can show its progress even after the dialog was closed and reopened. */
function useLatestJob(kind: JobKind) {
  const jobs = useJobs();
  return [...jobs].reverse().find((j) => j.kind === kind);
}

function JobProgress({ job, doneLabel }: { job: Job; doneLabel?: string }) {
  if (job.status === "running") {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
            {job.progress == null ? (
              <div className="h-full w-1/3 animate-pulse rounded-full bg-violet-400/70" />
            ) : (
              <div className="h-full bg-gradient-to-r from-cyan-400 to-violet-400 transition-[width] duration-150" style={{ width: `${job.progress * 100}%` }} />
            )}
          </div>
          <span className="w-10 text-right font-mono text-xs text-zinc-300">{job.progress == null ? "…" : `${Math.round(job.progress * 100)}%`}</span>
          <Button onClick={() => cancelJob(job.id)}>Cancelar</Button>
        </div>
        <p className="text-[11px] text-zinc-500">{job.message ?? "Trabajando…"} Puedes cerrar esta ventana: sigue en segundo plano.</p>
      </div>
    );
  }
  if (job.status === "error") return <p className="rounded-lg bg-red-500/10 p-3 text-xs text-red-200 ring-1 ring-red-400/20">{job.error}</p>;
  if (job.status === "done") return <p className="flex items-center gap-1.5 text-xs text-emerald-300"><Check size={13} /> {job.savedTo ? `Guardado en ${job.savedTo}` : doneLabel ?? "¡Listo! Revisa tus descargas."}</p>;
  return null;
}

export function ExportDialog({ open, onClose, doc }: { open: boolean; onClose: () => void; doc: WallpaperDoc }) {
  const [format, setFormat] = useState<ExportFormat>("png");
  const [quality, setQuality] = useState(0.92);
  const [extra, setExtra] = useState<string[]>([]);
  const job = useLatestJob("image");
  const running = job?.status === "running";

  const targets = [
    { id: "current", label: "Actual", width: doc.width, height: doc.height },
    ...RESOLUTIONS.filter((r) => extra.includes(r.id) && !(r.width === doc.width && r.height === doc.height)),
  ];
  const tooBig = isSafari() && targets.some((t) => t.width * t.height > SAFARI_MAX_PIXELS);

  const run = () => {
    const snapshot = structuredClone(doc);
    const list = [...targets];
    const ext = format === "jpeg" ? "jpg" : format;
    startJob("image", list.length > 1 ? `${list.length} imágenes` : `${format.toUpperCase()} ${doc.width}×${doc.height}`, async ({ progress, signal }) => {
      // Packs download each image as soon as it's ready; the last one is returned to the job runner.
      for (const [i, t] of list.entries()) {
        if (signal.aborted) throw new DOMException("Cancelado", "AbortError");
        progress(i / list.length, `Renderizando ${t.width}×${t.height} (${i + 1}/${list.length})…`);
        await new Promise((r) => setTimeout(r, 0));
        const blob = await renderToBlob({ ...snapshot, width: t.width, height: t.height }, t.width, t.height, format, quality);
        const filename = `tapiz-${t.width}x${t.height}.${ext}`;
        if (i === list.length - 1) return { blob, filename };
        downloadBlob(blob, filename);
        await new Promise((r) => setTimeout(r, 350));
      }
      throw new Error("Nada que exportar");
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Descargar wallpaper">
      <div className="space-y-5 p-5">
        {doc.scenes && doc.scenes.length > 1 && <DynamicExport doc={doc} />}
        {docIsAnimated(doc) && <AnimatedExport doc={doc} />}
        <div className="rounded-xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 p-4 ring-1 ring-violet-400/20">
          <p className="text-xs text-zinc-400">{doc.scenes ? "Imagen fija de la escena actual" : "Resolución principal"}</p>
          <p className="font-mono text-2xl font-semibold text-white">
            {doc.width} × {doc.height}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{((doc.width * doc.height) / 1e6).toFixed(1)} megapíxeles · render vectorial a tamaño real</p>
        </div>

        <Segmented
          label="Formato"
          value={format}
          options={[
            { value: "png", label: "PNG (sin pérdida)" },
            { value: "jpeg", label: "JPG" },
            { value: "webp", label: "WebP" },
          ]}
          onChange={setFormat}
        />
        {format !== "png" && <Slider label="Calidad" value={quality} min={0.6} max={1} format={(v) => `${Math.round(v * 100)}%`} onChange={setQuality} />}

        <div>
          <p className="mb-2 text-xs text-zinc-400">Pack multi-dispositivo — el diseño se adapta solo a cada pantalla</p>
          <div className="grid grid-cols-2 gap-1.5">
            {RESOLUTIONS.filter((r) => !(r.width === doc.width && r.height === doc.height)).map((r) => {
              const on = extra.includes(r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => setExtra(on ? extra.filter((x) => x !== r.id) : [...extra, r.id])}
                  className={cx(
                    "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs ring-1 transition",
                    on ? "bg-violet-500/15 text-white ring-violet-400/40" : "text-zinc-400 ring-white/5 hover:bg-white/5 hover:text-zinc-200",
                  )}
                >
                  <span className={cx("flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded", on ? "bg-violet-500" : "ring-1 ring-white/20")}>{on && <Check size={10} />}</span>
                  <span className="min-w-0 flex-1 truncate">{r.label}</span>
                  <span className="font-mono text-[10px] text-zinc-500">
                    {r.width}×{r.height}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {tooBig && <p className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-200 ring-1 ring-amber-400/20">Safari limita los lienzos a ~16.7 MP. Para 6K usa Chrome, Edge o Firefox.</p>}
        {job && <JobProgress job={job} />}

        {!running && (
          <Button variant="primary" className="w-full py-2.5" onClick={run}>
            <Download size={16} /> Descargar {targets.length > 1 ? `${targets.length} imágenes` : format.toUpperCase()}
          </Button>
        )}
      </div>
    </Modal>
  );
}

function AnimatedExport({ doc }: { doc: WallpaperDoc }) {
  const [res, setRes] = useState<"doc" | "fhd" | "4k">(doc.width * doc.height > 3840 * 2160 ? "4k" : "doc");
  const [fps, setFps] = useState("30");
  const [codec, setCodec] = useState<VideoCodecChoice>("hevc");
  const [copied, setCopied] = useState(false);
  const job = useLatestJob("mp4");
  const running = job?.status === "running";

  const size = (() => {
    const r = doc.width / doc.height;
    if (res === "doc") return { width: doc.width, height: doc.height };
    const long = res === "4k" ? 3840 : 1920;
    return r >= 1 ? { width: long, height: Math.round(long / r / 2) * 2 } : { width: Math.round((long * r) / 2) * 2, height: long };
  })();
  const seconds = loopOf(doc);
  const mb = estimateVideoMB(size.width, size.height, Number(fps), codec, seconds);
  const avcTooBig = codec === "avc" && Math.max(size.width, size.height) > 4096;

  const run = async () => {
    const filename = `tapiz-animado-${size.width}x${size.height}.mp4`;
    // Chrome/Edge: ask where to save first (needs this click) and stream straight to disk.
    let file: FileSystemFileHandle | undefined;
    if (canStreamToDisk()) {
      try {
        file = await pickVideoFile(filename);
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // user closed the save dialog
      }
    }
    const snapshot = structuredClone(doc);
    const opts = { ...size, fps: Number(fps), codec };
    startJob("mp4", `MP4 ${size.width}×${size.height} · ${fps} fps`, async ({ progress, signal }) => {
      const blob = await renderLoopVideo(snapshot, { ...opts, file }, { progress, signal });
      return blob ? { blob, filename } : { savedTo: file?.name ?? filename };
    });
  };

  const copyLive = async () => {
    const url = await makeShareUrl(doc, "/live");
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-3 rounded-xl bg-gradient-to-br from-emerald-400/10 via-cyan-500/10 to-violet-500/15 p-4 ring-1 ring-cyan-400/25">
      <div className="flex items-center gap-2">
        <Clapperboard size={16} className="text-cyan-300" />
        <p className="text-sm font-semibold text-white">Wallpaper animado</p>
        <span className="ml-auto font-mono text-[11px] text-zinc-500">loop de {seconds}s</span>
      </div>
      <p className="text-xs leading-relaxed text-zinc-400">
        macOS no permite fondos animados propios de forma nativa. Tienes dos caminos: el <b className="text-zinc-200">link en vivo</b> para la app gratuita{" "}
        <a href="https://sindresorhus.com/plash" target="_blank" rel="noreferrer" className="text-cyan-300 underline">
          Plash
        </a>{" "}
        (se ve nítido a cualquier resolución y respeta día/noche), o un <b className="text-zinc-200">video MP4 en loop</b> para apps de fondos en video.
      </p>

      <Button variant="soft" className="w-full" onClick={copyLive}>
        {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "¡Link copiado! Pégalo en Plash → Add Website" : "Copiar link en vivo (Plash)"}
      </Button>
      {doc.layers.some((l) => l.type === "image") && <p className="text-[11px] text-amber-200/80">Ojo: tus fotos no viajan en el link en vivo; usa el video si tu diseño tiene fotos.</p>}

      <div className="grid grid-cols-3 gap-2">
        <Segmented
          value={res}
          onChange={setRes}
          options={[
            { value: "fhd", label: "HD" },
            { value: "4k", label: "4K" },
            { value: "doc", label: "Actual" },
          ]}
        />
        <Segmented
          value={fps}
          onChange={setFps}
          options={[
            { value: "30", label: "30 fps" },
            { value: "60", label: "60 fps" },
          ]}
        />
        <Segmented
          value={codec}
          onChange={setCodec}
          options={[
            { value: "hevc", label: "HEVC", title: "Mejor calidad y peso; ideal para Mac" },
            { value: "avc", label: "H.264", title: "Máxima compatibilidad (hasta ~4K)" },
          ]}
        />
      </div>
      <p className="text-[11px] text-zinc-500">
        ≈ {mb < 1 ? mb.toFixed(1) : Math.round(mb)} MB · {Math.round(seconds * Number(fps))} cuadros
        {canStreamToDisk() ? " · se guarda directo en tu disco" : mb > 400 ? " · archivo grande: si falla, baja fps o resolución" : ""}
      </p>
      {avcTooBig && <p className="text-[11px] text-amber-200/80">H.264 solo llega hasta ~4K; usa HEVC o elige 4K/HD.</p>}
      {job && <JobProgress job={job} doneLabel="¡Video listo! Revisa tus descargas." />}
      {!running && (
        <Button variant="primary" className="w-full py-2.5" onClick={run} disabled={avcTooBig}>
          <Download size={16} /> Descargar MP4 {size.width}×{size.height}
        </Button>
      )}
    </div>
  );
}

function DynamicExport({ doc }: { doc: WallpaperDoc }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const job = useLatestJob("heic");
  const running = job?.status === "running";

  useEffect(() => {
    canEncodeHeic(doc.width + (doc.width % 2), doc.height + (doc.height % 2)).then(setSupported);
  }, [doc.width, doc.height]);

  const run = () => {
    const snapshot = structuredClone(doc);
    startJob("heic", `.heic ${doc.width}×${doc.height}`, async ({ progress, signal }) => ({
      blob: await renderDynamicHeic(snapshot, { progress, signal }),
      filename: `tapiz-dinamico-${doc.width}x${doc.height}.heic`,
    }));
  };

  const mode = doc.dynamicMode === "time" ? "según la hora del día" : "según el modo claro/oscuro";
  return (
    <div className="rounded-xl bg-gradient-to-br from-amber-400/10 via-fuchsia-500/10 to-indigo-500/20 p-4 ring-1 ring-indigo-400/25">
      <div className="flex items-center gap-2">
        <Sun size={16} className="text-amber-300" />
        <Moon size={16} className="-ml-1.5 text-indigo-300" />
        <p className="text-sm font-semibold text-white">Wallpaper dinámico para macOS</p>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-zinc-400">
        Un solo archivo <b className="text-zinc-200">.heic</b> con {doc.scenes?.length} escenas que cambian {mode}. Se genera en tu navegador, nada sale de tu Mac.
      </p>
      {supported === false ? (
        <p className="mt-3 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-200 ring-1 ring-amber-400/20">
          Tu equipo no puede codificar HEVC a {doc.width}×{doc.height}. Prueba 4K o 5K, o abre Tapiz en Chrome o Safari en una Mac reciente.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {job && <JobProgress job={job} doneLabel="¡.heic listo! Revisa tus descargas." />}
          {!running && (
            <Button variant="primary" className="w-full py-2.5" onClick={run} disabled={supported == null}>
              <Download size={16} /> Descargar .heic dinámico
            </Button>
          )}
        </div>
      )}
      {job?.status === "done" && (
        <ol className="mt-3 list-decimal space-y-1 pl-4 text-[11px] leading-relaxed text-zinc-400">
          <li>Abre Ajustes del Sistema → Fondo de pantalla → “Añadir foto…” (o clic derecho en el archivo → “Establecer imagen de escritorio”).</li>
          <li>
            Elige la opción <b className="text-zinc-200">{doc.dynamicMode === "time" ? "Dinámico" : "Automático"}</b> en el menú del fondo.
          </li>
        </ol>
      )}
    </div>
  );
}

/* ---------- Saved designs ---------- */

export function SavedDialog({ open, onClose, editor }: { open: boolean; onClose: () => void; editor: Editor }) {
  return (
    <Modal open={open} onClose={onClose} title="Mis diseños" wide>
      {open && <SavedBody onClose={onClose} editor={editor} />}
    </Modal>
  );
}

function SavedBody({ onClose, editor }: { onClose: () => void; editor: Editor }) {
  const [list, setList] = useState<SavedDesign[]>(listSaved);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    const thumb = await renderThumb(editor.doc, 320);
    const item: SavedDesign = { id: uid(), name: name.trim() || `Diseño ${list.length + 1}`, savedAt: Date.now(), thumb, doc: editor.doc };
    const next = [item, ...list];
    if (writeSaved(next)) {
      setList(next);
      setName("");
    } else setError("No hay espacio en el almacenamiento del navegador. Borra algún diseño.");
    setSaving(false);
  };

  const remove = (id: string) => {
    const next = list.filter((d) => d.id !== id);
    writeSaved(next);
    setList(next);
  };

  return (
    <>
      <div className="flex gap-2 border-b border-white/5 p-5">
        <input className="tz-input flex-1 text-sm" placeholder="Nombre del diseño…" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
        <Button variant="primary" onClick={save} disabled={saving}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : null} Guardar actual
        </Button>
      </div>
      {error && <p className="mx-5 mt-4 rounded-lg bg-red-500/10 p-3 text-xs text-red-200">{error}</p>}
      <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
        {list.map((d) => (
          <div key={d.id} className="group relative">
            <button
              onClick={() => {
                editor.loadDesign({ scenes: undefined, activeScene: undefined, dynamicMode: undefined, ...d.doc });
                onClose();
              }}
              className="block w-full overflow-hidden rounded-xl ring-1 ring-white/10 transition hover:ring-violet-400/60"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.thumb} alt={d.name} className="w-full" />
            </button>
            <div className="mt-1.5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-200">{d.name}</p>
                <p className="text-[10px] text-zinc-500">
                  {d.doc.width}×{d.doc.height} · {new Date(d.savedAt).toLocaleDateString()}
                </p>
              </div>
              <button onClick={() => remove(d.id)} className="rounded p-1 text-zinc-500 opacity-0 hover:bg-white/10 hover:text-red-300 group-hover:opacity-100">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
        {!list.length && <p className="col-span-full py-8 text-center text-sm text-zinc-500">Aún no guardas diseños. Se guardan en este navegador.</p>}
      </div>
    </>
  );
}

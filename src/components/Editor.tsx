"use client";

import {
  Bookmark,
  ChevronDown,
  CircleHelp,
  Dices,
  Download,
  LayoutTemplate,
  Link2,
  Monitor,
  MoreHorizontal,
  Moon,
  Palette,
  Redo2,
  Shuffle,
  Smartphone,
  Sun,
  Undo2,
  Wand2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PALETTES } from "@/lib/catalog";
import { shuffle as shuffleArr, mulberry32, randomSeed } from "@/lib/random";
import { findResolution, ratioLabel } from "@/lib/resolutions";
import { makeDynamic, resyncScenes, syncScenes } from "@/lib/scenes";
import { isApple, key } from "@/lib/platform";
import { useIsDesktop } from "@/lib/useMedia";
import { image } from "@/lib/factory";
import { type PhotoMeta, addPhoto, looksLikeImageUrl, photoFromUrl } from "@/lib/photos";
import { type Editor as EditorApi, makeShareUrl, useEditor } from "@/lib/store";
import { recolor, reseed, surprise } from "@/lib/templates";
import type { Layer } from "@/lib/types";
import { ExportDialog, SavedDialog, TemplatesDialog } from "./Dialogs";
import { JobsPanel } from "./JobsPanel";
import { type HelpAction, HelpDialog, WELCOME_KEY } from "./HelpDialog";
import { ScenesBar } from "./ScenesBar";
import { SizeDialog } from "./SizeDialog";
import { Inspector } from "./Inspector";
import { LayersPanel } from "./LayersPanel";
import { type Handle, Preview } from "./Preview";
import { MobilePanels, type Sheet } from "./MobilePanels";
import { Button, Modal, Popover, cx } from "./ui";

type Dialog = "templates" | "export" | "saved" | "size" | "help";

export function Editor() {
  const editor = useEditor();
  const { doc, selected } = editor;
  // The welcome splash opens by itself only once per browser; the "?" button reopens it.
  const [firstRun, setFirstRun] = useState(() => {
    try {
      if (localStorage.getItem(WELCOME_KEY)) return false;
      localStorage.setItem(WELCOME_KEY, String(Date.now()));
      return true;
    } catch {
      return false; // storage blocked: don't nag on every visit
    }
  });
  const [dialog, setDialog] = useState<null | Dialog>(firstRun ? "help" : null);
  const [addMenuSignal, setAddMenuSignal] = useState(0);
  const isDesktop = useIsDesktop();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  // On phones, picking or adding a layer from "Capas" jumps straight to its settings.
  const [seenSelection, setSeenSelection] = useState(selected);
  if (selected !== seenSelection) {
    setSeenSelection(selected);
    if (!isDesktop && sheet === "layers") setSheet("edit");
  }
  const [toast, setToast] = useState<string | null>(null);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const handles = useMemo<Handle[]>(() => {
    if (selected === "background") {
      const bg = doc.background;
      if (bg.kind === "mesh") return bg.points.map((p, i) => ({ id: `mesh:${i}`, x: p.x, y: p.y, color: p.color, label: `Color ${i + 1}` }));
      if (bg.kind === "radial" || bg.kind === "conic") return [{ id: "center", x: bg.cx, y: bg.cy, label: "Centro" }];
      return [];
    }
    const l = doc.layers.find((x) => x.id === selected);
    if (!l || !l.visible) return [];
    if (l.type === "text") return [{ id: "pos", x: l.x, y: l.y }];
    if ("placement" in l && l.placement.mode === "single") return [{ id: "pos", x: l.placement.x, y: l.placement.y }];
    return [];
  }, [doc, selected]);

  const onHandleMove = useCallback(
    (id: string, x: number, y: number) => {
      const clamp = (v: number) => Math.round(Math.min(1.2, Math.max(-0.2, v)) * 1000) / 1000;
      x = clamp(x);
      y = clamp(y);
      if (selected === "background") {
        editor.setDoc((d) => {
          const bg = d.background;
          if (id.startsWith("mesh:") && bg.kind === "mesh") {
            const i = Number(id.split(":")[1]);
            return { ...d, background: { ...bg, points: bg.points.map((p, j) => (j === i ? { ...p, x, y } : p)) } };
          }
          if (id === "center" && (bg.kind === "radial" || bg.kind === "conic")) return { ...d, background: { ...bg, cx: x, cy: y } };
          return d;
        }, `drag:${id}`);
        return;
      }
      editor.updateLayer<Layer>(
        selected,
        (l) => {
          if (l.type === "text") return { ...l, x, y };
          if ("placement" in l) return { ...l, placement: { ...l.placement, x, y } } as Layer;
          return l;
        },
        "drag",
      );
    },
    [editor, selected],
  );

  /** With day/night: "all" regenerates every scene from one idea (in sync); "scene" only replaces the one you're on. */
  const doSurprise = useCallback(
    (scope: "all" | "scene" = "all") => {
      const s = surprise();
      if (!doc.scenes) {
        editor.loadDesign(s);
      } else if (scope === "scene") {
        editor.setDoc((d) => ({ ...d, background: s.background, layers: s.layers }));
      } else {
        editor.setDoc((d) => ({ ...resyncScenes(d, s), backgroundAnim: s.backgroundAnim, loop: s.loop }));
      }
      flash(doc.scenes ? (scope === "scene" ? "🎲 Nueva idea solo para esta escena" : "🎲 ¡Sorpresa! Todas las escenas en sync") : "🎲 ¡Sorpresa!");
    },
    [doc.scenes, editor, flash],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      const typing = t instanceof Element && t.closest("input, textarea, select, [contenteditable]");
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z" && !typing) {
        e.preventDefault();
        if (e.shiftKey) editor.redo();
        else editor.undo();
      } else if (mod && e.key.toLowerCase() === "y" && !typing) {
        e.preventDefault();
        editor.redo();
      } else if (mod && e.key.toLowerCase() === "d" && selected !== "background") {
        e.preventDefault();
        editor.duplicateLayer(selected);
      } else if (mod && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setDialog("export");
      } else if ((e.key === "Delete" || e.key === "Backspace") && !typing && selected !== "background") {
        editor.removeLayer(selected);
      } else if (e.key === "?" && !typing) {
        e.preventDefault();
        setDialog("help");
      } else if (e.key === " " && !typing && !mod && !e.repeat) {
        e.preventDefault();
        doSurprise();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor, selected, doSurprise]);

  /* ---------- Photos from clipboard / drag & drop ---------- */
  const addPhotos = useCallback(
    async (job: () => Promise<PhotoMeta[]>) => {
      flash("📷 Procesando imagen…");
      try {
        const photos = await job();
        const ids = photos.map((p) => p.id);
        if (!ids.length) return;
        const stickers = photos.every((p) => p.hasAlpha);
        const current = doc.layers.find((l) => l.id === selected);
        if (current?.type === "image" && current.mode === "items") {
          editor.updateLayer(current.id, { images: [...current.images, ...ids] });
        } else {
          editor.addLayer(
            image({
              name: "Foto",
              images: ids,
              frame: stickers ? "none" : "rounded",
              placement: ids.length > 1 ? { mode: "scatter", count: ids.length * 2 } : { mode: "single", size: 0.5, rotation: -4 },
            }),
          );
        }
        flash("📷 ¡Foto añadida! En el panel puedes ponerla de fondo completo");
      } catch (e) {
        flash(e instanceof Error ? e.message : "No se pudo añadir la imagen");
      }
    },
    [doc.layers, selected, editor, flash],
  );

  const takeTransfer = useCallback(
    (data: DataTransfer | null) => {
      if (!data) return false;
      const files = [...data.files].filter((f) => f.type.startsWith("image/"));
      if (files.length) {
        addPhotos(() => Promise.all(files.map((f) => addPhoto(f, f.name.replace(/\.[^.]+$/, "") || "Foto"))));
        return true;
      }
      const html = data.getData("text/html");
      const fromHtml = html.match(/<img[^>]+src="([^"]+)"/i)?.[1]?.replace(/&amp;/g, "&");
      const text = (data.getData("text/uri-list") || data.getData("text/plain") || fromHtml || "").trim().split("\n")[0];
      const url = looksLikeImageUrl(text) ? text : fromHtml && looksLikeImageUrl(fromHtml) ? fromHtml : null;
      if (url) {
        addPhotos(async () => [await photoFromUrl(url)]);
        return true;
      }
      return false;
    },
    [addPhotos],
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (e.target instanceof Element && e.target.closest("input, textarea, [contenteditable]")) return;
      if (takeTransfer(e.clipboardData)) e.preventDefault();
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [takeTransfer]);

  const [dropping, setDropping] = useState(false);

  const share = async () => {
    try {
      const url = await makeShareUrl(doc);
      await navigator.clipboard.writeText(url);
      flash(
        doc.layers.some((l) => l.type === "image")
          ? "🔗 Link copiado — ojo: tus fotos no viajan en el link"
          : "🔗 Link copiado — quien lo abra verá tu diseño",
      );
    } catch {
      flash("No se pudo copiar el link");
    }
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <TopBar editor={editor} compact={!isDesktop} onDialog={setDialog} onSurprise={doSurprise} onShare={share} flash={flash} />
      <div className="flex min-h-0 flex-1">
        {isDesktop && (
          <aside className="flex w-64 shrink-0 flex-col border-r border-white/5 bg-zinc-900/60">
            <LayersPanel editor={editor} openMenuSignal={addMenuSignal} />
            <div className="border-t border-white/5 p-3 text-[10.5px] leading-relaxed text-zinc-500">
              <kbd className="text-zinc-400">Espacio</kbd> sorpresa · <kbd className="text-zinc-400">{key("Z")}</kbd> deshacer · <kbd className="text-zinc-400">{key("D")}</kbd> duplicar ·{" "}
              <kbd className="text-zinc-400">{key("E")}</kbd> exportar · <kbd className="text-zinc-400">?</kbd> ayuda
            </div>
          </aside>
        )}
        <main
          className="relative flex min-w-0 flex-1 flex-col"
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes("Files") && !e.dataTransfer.types.includes("text/uri-list")) return;
            e.preventDefault();
            setDropping(true);
          }}
          onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDropping(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDropping(false);
            takeTransfer(e.dataTransfer);
          }}
        >
          {dropping && (
            <div className="pointer-events-none absolute inset-3 z-30 flex items-center justify-center rounded-2xl border-2 border-dashed border-violet-400 bg-violet-500/10 text-sm font-medium text-violet-100 backdrop-blur-sm">
              Suelta tus fotos aquí 📷
            </div>
          )}
          <div className="min-h-0 flex-1">
            <Preview doc={doc} handles={handles} onHandleMove={onHandleMove} onLoopChange={(loop) => editor.setDoc((d) => ({ ...d, loop }))} />
          </div>
          {isDesktop ? (
            <ScenesBar editor={editor} onExport={() => setDialog("export")} />
          ) : (
            <MobilePanels
              editor={editor}
              sheet={sheet}
              setSheet={setSheet}
              onExport={() => setDialog("export")}
              onDayNight={() => {
                editor.setDoc((d) => makeDynamic(d));
                setSheet("scenes");
                flash("🌙 Creé una versión de noche");
              }}
            />
          )}
        </main>
        {isDesktop && (
          <aside className="tz-scroll w-80 shrink-0 overflow-y-auto border-l border-white/5 bg-zinc-900/60">
            <Inspector key={selected} editor={editor} />
          </aside>
        )}
      </div>

      <TemplatesDialog open={dialog === "templates"} onClose={() => setDialog(null)} editor={editor} />
      {dialog === "export" && <ExportDialog open onClose={() => setDialog(null)} doc={doc} />}
      <SavedDialog open={dialog === "saved"} onClose={() => setDialog(null)} editor={editor} />
      <JobsPanel onOpen={() => setDialog("export")} />
      {dialog === "help" && (
        <HelpDialog
          open
          firstRun={firstRun}
          onClose={() => {
            setDialog(null);
            setFirstRun(false);
          }}
          onAction={(a: HelpAction) => {
            setDialog(null);
            setFirstRun(false);
            if (a === "templates" || a === "export" || a === "size" || a === "saved") setDialog(a);
            else if (a === "surprise") doSurprise();
            else if (a === "add") {
              if (isDesktop) setAddMenuSignal((n) => n + 1);
              else setSheet("layers");
            }
            else if (a === "photos") editor.addLayer("image");
            else if (a === "daynight" && !doc.scenes) {
              editor.setDoc((d) => makeDynamic(d));
              flash("🌙 Creé una versión de noche — edítala abajo");
            }
          }}
        />
      )}
      {/* Mounted only while open so search/tab state starts fresh each time. */}
      {dialog === "size" && (
      <SizeDialog
        open
        onClose={() => setDialog(null)}
        width={doc.width}
        height={doc.height}
        onPick={(width, height) => editor.setDoc((d) => ({ ...d, width, height }))}
      />
      )}

      <div
        className={cx(
          "pointer-events-none fixed bottom-20 left-1/2 z-50 max-w-[90vw] text-center lg:bottom-6 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-2xl transition-all",
          toast ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        )}
      >
        {toast}
      </div>
    </div>
  );
}

function RemixPalettes({ onPick }: { onPick: (colors: string[]) => void }) {
  return (
    <>
      <p className="px-2 pb-2 pt-1 text-[11px] text-zinc-500">Recolorea todo el diseño manteniendo luces y sombras</p>
      <div className="grid grid-cols-2 gap-1">
        {PALETTES.map((p) => (
          <button key={p.name} onClick={() => onPick(p.colors)} className="rounded-lg p-1.5 text-left transition hover:bg-white/8">
            <div className="flex h-5 overflow-hidden rounded-md">
              {p.colors.map((c) => (
                <span key={c} className="flex-1" style={{ background: c }} />
              ))}
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">{p.name}</p>
          </button>
        ))}
      </div>
      <button
        onClick={() => {
          const rng = mulberry32(randomSeed());
          onPick(shuffleArr(rng, PALETTES[Math.floor(rng() * PALETTES.length)].colors));
        }}
        className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/5 py-1.5 text-xs text-zinc-300 hover:bg-white/10"
      >
        <Wand2 size={13} /> Paleta al azar
      </button>
    </>
  );
}

function TopBar({
  editor,
  compact,
  onDialog,
  onSurprise,
  onShare,
  flash,
}: {
  editor: EditorApi;
  compact: boolean;
  onDialog: (d: Dialog) => void;
  onSurprise: (scope?: "all" | "scene") => void;
  onShare: () => void;
  flash: (m: string) => void;
}) {
  const { doc } = editor;
  const [remix, setRemix] = useState(false);
  const [surpriseMenu, setSurpriseMenu] = useState(false);
  const [moreMenu, setMoreMenu] = useState(false);
  const [remixModal, setRemixModal] = useState(false);
  const res = findResolution(doc.width, doc.height);
  const portrait = doc.height > doc.width;

  const applyPalette = (colors: string[]) => {
    // Recolor every scene in one pass so day and night keep their relative light/dark.
    editor.setDoc((d) => ({ ...d, ...recolor({ background: d.background, layers: d.layers, scenes: d.scenes && syncScenes(d) }, colors) }));
  };
  const reshuffle = () => {
    editor.setDoc((d) => ({ ...d, layers: reseed(d.layers) }));
    flash("🔀 Nueva distribución");
  };
  const logo = (
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[conic-gradient(from_180deg,#f72585,#7b2ff7,#2de2e6,#feca57,#f72585)] shadow-lg shadow-fuchsia-500/20">
      <div className="h-3.5 w-3.5 rounded-sm bg-zinc-950/70" />
    </div>
  );

  if (compact) {
    const item = (icon: React.ReactNode, label: string, onClick: () => void, hint?: string) => (
      <button
        key={label}
        onClick={() => {
          setMoreMenu(false);
          onClick();
        }}
        className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-sm text-zinc-100 hover:bg-white/8"
      >
        <span className="text-zinc-400">{icon}</span>
        <span className="flex-1">{label}</span>
        {hint && <span className="font-mono text-[10px] text-zinc-500">{hint}</span>}
      </button>
    );
    return (
      <header className="relative z-30 flex h-14 shrink-0 items-center gap-1 border-b border-white/5 bg-zinc-900/80 px-2 backdrop-blur">
        {logo}
        <Button variant="soft" onClick={() => onDialog("templates")} className="ml-1 px-2.5" title="Plantillas">
          <LayoutTemplate size={17} />
        </Button>
        <Button variant="soft" onClick={() => onSurprise("all")} className="px-2.5" title="Sorpréndeme">
          <Dices size={17} />
        </Button>
        <Button onClick={editor.undo} disabled={!editor.canUndo} className="px-2" title="Deshacer">
          <Undo2 size={17} />
        </Button>
        <Button onClick={editor.redo} disabled={!editor.canRedo} className="px-2" title="Rehacer">
          <Redo2 size={17} />
        </Button>
        <div className="flex-1" />
        <div className="relative">
          <Button onClick={() => setMoreMenu(true)} className="px-2" title="Más">
            <MoreHorizontal size={18} />
          </Button>
          <Popover open={moreMenu} onClose={() => setMoreMenu(false)} className="right-0 top-11 w-64">
            {item(<Palette size={16} />, "Remix colores", () => setRemixModal(true))}
            {item(<Shuffle size={16} />, "Barajar", reshuffle)}
            {doc.scenes && item(<Dices size={16} />, "Sorpréndeme solo esta escena", () => onSurprise("scene"))}
            {item(portrait ? <Smartphone size={16} /> : <Monitor size={16} />, "Tamaño del lienzo", () => onDialog("size"), `${doc.width}×${doc.height}`)}
            {item(<Bookmark size={16} />, "Mis diseños", () => onDialog("saved"))}
            {item(<Link2 size={16} />, "Copiar link para compartir", onShare)}
            {item(<CircleHelp size={16} />, "Cómo usar Tapiz", () => onDialog("help"))}
          </Popover>
        </div>
        <Button variant="primary" onClick={() => onDialog("export")} className="px-3" title="Descargar">
          <Download size={17} />
        </Button>
        <Modal open={remixModal} onClose={() => setRemixModal(false)} title="Remix colores">
          <div className="p-3">
            <RemixPalettes onPick={applyPalette} />
          </div>
        </Modal>
      </header>
    );
  }

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-2 border-b border-white/5 bg-zinc-900/80 px-3 backdrop-blur">
      <div className="mr-2 flex items-center gap-2 pl-1">
        {logo}
        <div className="hidden leading-tight xl:block">
          <p className="text-sm font-bold tracking-tight">Tapiz</p>
          <p className="text-[10px] text-zinc-500">wallpaper studio</p>
        </div>
      </div>

      <Button variant="soft" onClick={() => onDialog("templates")} title="Plantillas">
        <LayoutTemplate size={15} /> <span className="hidden xl:inline">Plantillas</span>
      </Button>
      <div className="relative flex">
        <Button
          variant="soft"
          onClick={() => onSurprise("all")}
          title={doc.scenes ? "Nueva idea para todas las escenas, sincronizadas (Espacio)" : "Genera un wallpaper al azar (Espacio)"}
          className={cx(doc.scenes && "rounded-r-none")}
        >
          <Dices size={15} /> <span className="hidden xl:inline">Sorpréndeme</span>
        </Button>
        {doc.scenes && (
          <>
            <Button variant="soft" onClick={() => setSurpriseMenu(true)} className="rounded-l-none border-l border-white/10 px-1.5" title="Más opciones">
              <ChevronDown size={14} />
            </Button>
            <Popover open={surpriseMenu} onClose={() => setSurpriseMenu(false)} className="left-0 top-10 w-64">
              {(
                [
                  ["all", "☀️🌙 Todas las escenas", "La misma idea, adaptada a cada momento"],
                  ["scene", "🎯 Solo esta escena", "Para tener diseños distintos de día y de noche"],
                ] as const
              ).map(([scope, label, desc]) => (
                <button
                  key={scope}
                  onClick={() => {
                    onSurprise(scope);
                    setSurpriseMenu(false);
                  }}
                  className="block w-full rounded-lg px-2.5 py-2 text-left hover:bg-white/8"
                >
                  <span className="block text-sm text-zinc-100">{label}</span>
                  <span className="block text-[11px] text-zinc-500">{desc}</span>
                </button>
              ))}
            </Popover>
          </>
        )}
      </div>

      <div className="relative">
        <Button onClick={() => setRemix(true)} title="Cambia toda la paleta del diseño">
          <Palette size={15} /> <span className="hidden 2xl:inline">Remix colores</span>
        </Button>
        <Popover open={remix} onClose={() => setRemix(false)} className="left-0 top-10 w-72">
          <RemixPalettes onPick={applyPalette} />
        </Popover>
      </div>
      <Button onClick={reshuffle} title="Redistribuye los elementos dispersos">
        <Shuffle size={15} /> <span className="hidden 2xl:inline">Barajar</span>
      </Button>

      <div className="mx-1 h-6 w-px bg-white/10" />
      <Button onClick={editor.undo} disabled={!editor.canUndo} title={`Deshacer (${key("Z")})`} className="px-2">
        <Undo2 size={16} />
      </Button>
      <Button onClick={editor.redo} disabled={!editor.canRedo} title={`Rehacer (${key("Z", true)})`} className="px-2">
        <Redo2 size={16} />
      </Button>

      <div className="flex-1" />

      <Button
        onClick={() => {
          if (doc.scenes) return;
          editor.setDoc((d) => makeDynamic(d));
          flash("🌙 Creé una versión de noche — edítala abajo");
        }}
        className={cx(doc.scenes && "bg-indigo-500/15 text-indigo-100 ring-1 ring-indigo-400/30")}
        title={isApple() ? "Wallpaper dinámico que cambia de día a noche (.heic para macOS)" : "Escenas de día y de noche (en Mac se descargan como .heic dinámico)"}
      >
        <Sun size={15} className="text-amber-300" />
        <Moon size={15} className="-ml-1.5 text-indigo-300" />
        <span className="hidden 2xl:inline">Día / Noche</span>
      </Button>

      <Button variant="soft" onClick={() => onDialog("size")} title="Dispositivo, proporción o tamaño personalizado">
        {portrait ? <Smartphone size={15} /> : <Monitor size={15} />}
        <span className="max-w-28 truncate xl:max-w-40">{res?.label ?? ratioLabel(doc.width, doc.height)}</span>
        <span className="hidden font-mono text-[11px] text-zinc-500 2xl:inline">
          {doc.width}×{doc.height}
        </span>
      </Button>

      <Button
        onClick={() => onDialog("help")}
        title="Cómo usar Tapiz (?)"
        className="h-8 w-8 rounded-full px-0 text-zinc-400 ring-1 ring-white/10 hover:text-white"
      >
        <CircleHelp size={16} />
      </Button>
      <Button onClick={() => onDialog("saved")} title="Mis diseños">
        <Bookmark size={15} />
      </Button>
      <Button onClick={onShare} title="Copiar link para compartir">
        <Link2 size={15} />
      </Button>
      <Button variant="primary" onClick={() => onDialog("export")}>
        <Download size={15} /> Descargar
      </Button>
    </header>
  );
}

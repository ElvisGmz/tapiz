"use client";

import { ChevronDown, Layers, Moon, Plus, SlidersHorizontal, Sun } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { Editor } from "@/lib/store";
import { Inspector } from "./Inspector";
import { AddLayerMenu, LayersPanel } from "./LayersPanel";
import { LAYER_META } from "./meta";
import { ScenesBar } from "./ScenesBar";
import { Modal, cx } from "./ui";

export type Sheet = "layers" | "edit" | "scenes";

/**
 * Phone / portrait-tablet layout: the preview stays on top and the panels slide up
 * as a bottom sheet, picked from a tab bar.
 */
export function MobilePanels({
  editor,
  sheet,
  setSheet,
  onExport,
  onDayNight,
}: {
  editor: Editor;
  sheet: Sheet | null;
  setSheet: (s: Sheet | null) => void;
  onExport: () => void;
  onDayNight: () => void;
}) {
  const { doc, selected } = editor;
  const layer = doc.layers.find((l) => l.id === selected);
  const editLabel = selected === "background" ? "Fondo" : (layer?.name ?? "Editar");
  const EditIcon = layer ? LAYER_META[layer.type].icon : SlidersHorizontal;

  const [adding, setAdding] = useState(false);
  const titles: Record<Sheet, string> = { layers: "Capas", edit: selected === "background" ? "Editar fondo" : "Editar capa", scenes: "Día / Noche" };
  const toggle = (s: Sheet) => setSheet(sheet === s ? null : s);

  return (
    <>
      {sheet && (
        <section className="flex h-[48dvh] shrink-0 flex-col overflow-hidden rounded-t-2xl border-t border-white/10 bg-zinc-900 shadow-[0_-12px_40px_rgba(0,0,0,0.5)]">
          <button onClick={() => setSheet(null)} className="flex shrink-0 items-center justify-between px-4 pb-1 pt-2 text-left" aria-label="Cerrar panel">
            <span className="text-sm font-semibold text-white">{titles[sheet]}</span>
            <span className="flex flex-col items-center">
              <ChevronDown size={18} className="text-zinc-500" />
            </span>
          </button>
          <div className="min-h-0 flex-1">
            {sheet === "layers" && <LayersPanel editor={editor} compact />}
            {sheet === "edit" && (
              <div className="tz-scroll h-full overflow-y-auto pb-4">
                <Inspector key={selected} editor={editor} />
              </div>
            )}
            {sheet === "scenes" && (
              <div className="tz-scroll h-full overflow-y-auto">
                {doc.scenes ? (
                  <ScenesBar editor={editor} onExport={onExport} />
                ) : (
                  <div className="space-y-3 p-5 text-center">
                    <p className="text-sm text-zinc-300">Crea una versión de noche (y atardecer, amanecer…) de tu diseño.</p>
                    <button onClick={onDayNight} className="rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white">
                      Activar día / noche
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <nav className="flex h-16 shrink-0 items-stretch border-t border-white/5 bg-zinc-900/95 pb-[env(safe-area-inset-bottom)]">
        <Tab active={sheet === "layers"} onClick={() => toggle("layers")} icon={<Layers size={19} />} label={`Capas (${doc.layers.length})`} />
        <Tab active={sheet === "edit"} onClick={() => toggle("edit")} icon={<EditIcon size={19} />} label={editLabel} />
        <Tab
          active={sheet === "scenes"}
          onClick={() => toggle("scenes")}
          icon={
            <span className="flex">
              <Sun size={17} className="text-amber-300" />
              <Moon size={17} className="-ml-1 text-indigo-300" />
            </span>
          }
          label={doc.scenes ? `Escenas (${doc.scenes.length})` : "Día / Noche"}
        />
        <button onClick={() => setAdding(true)} className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] text-violet-200" aria-label="Añadir capa">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/30">
            <Plus size={18} />
          </span>
        </button>
      </nav>

      <Modal open={adding} onClose={() => setAdding(false)} title="Añadir capa">
        <div className="p-2">
          <AddLayerMenu
            onAdd={(l) => {
              editor.addLayer(l);
              setAdding(false);
              setSheet("edit");
            }}
          />
        </div>
      </Modal>
    </>
  );
}

function Tab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cx("flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-[10.5px] transition", active ? "text-white" : "text-zinc-500")}
    >
      <span className={cx("rounded-full px-3 py-0.5 transition", active && "bg-violet-500/25")}>{icon}</span>
      <span className="max-w-full truncate">{label}</span>
    </button>
  );
}

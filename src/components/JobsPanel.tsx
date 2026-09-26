"use client";

import { Check, Loader2, X, TriangleAlert } from "lucide-react";
import { cancelJob, dismissJob, useJobs } from "@/lib/jobs";
import { cx } from "./ui";

/** Floating list of exports; stays visible when the export dialog is closed. */
export function JobsPanel({ onOpen }: { onOpen: () => void }) {
  const jobs = useJobs().filter((j) => j.status !== "cancelled");
  if (!jobs.length) return null;
  return (
    <div className="fixed inset-x-3 bottom-[4.75rem] z-40 space-y-2 sm:inset-x-auto sm:right-4 sm:w-80 lg:bottom-4">
      {jobs.map((j) => (
        <div key={j.id} className="rounded-xl border border-white/10 bg-zinc-900/95 p-3 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2">
            {j.status === "running" && <Loader2 size={14} className="animate-spin text-violet-300" />}
            {j.status === "done" && <Check size={14} className="text-emerald-300" />}
            {j.status === "error" && <TriangleAlert size={14} className="text-red-300" />}
            <button onClick={onOpen} className="min-w-0 flex-1 truncate text-left text-xs font-medium text-zinc-100 hover:underline" title="Abrir descargas">
              {j.label}
            </button>
            {j.status === "running" ? (
              <button onClick={() => cancelJob(j.id)} className="rounded px-1.5 text-[11px] text-zinc-400 hover:bg-white/10 hover:text-white">
                Cancelar
              </button>
            ) : (
              <button onClick={() => dismissJob(j.id)} className="rounded p-0.5 text-zinc-500 hover:bg-white/10 hover:text-white" aria-label="Cerrar">
                <X size={13} />
              </button>
            )}
          </div>
          {j.status === "running" && (
            <>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className={cx("h-full bg-gradient-to-r from-cyan-400 to-violet-400 transition-[width] duration-150", j.progress == null && "w-1/3 animate-pulse")}
                  style={j.progress == null ? undefined : { width: `${j.progress * 100}%` }}
                />
              </div>
              <p className="mt-1.5 flex justify-between text-[10.5px] text-zinc-500">
                <span className="truncate">{j.message ?? "Trabajando…"}</span>
                {j.progress != null && <span className="font-mono">{Math.round(j.progress * 100)}%</span>}
              </p>
            </>
          )}
          {j.status === "done" && <p className="mt-1 text-[11px] text-zinc-400">{j.savedTo ? `Guardado como ${j.savedTo}` : "Listo — revisa tus descargas."}</p>}
          {j.status === "error" && <p className="mt-1 text-[11px] leading-snug text-red-200">{j.error}</p>}
        </div>
      ))}
    </div>
  );
}

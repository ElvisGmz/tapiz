"use client";

import { useSyncExternalStore } from "react";
import { downloadBlob } from "./export";

/**
 * Background export jobs. They live outside React components, so closing the
 * export dialog doesn't cancel them; a floating panel shows their progress.
 */

export type JobKind = "mp4" | "heic" | "image";

export interface Job {
  id: string;
  kind: JobKind;
  label: string;
  status: "running" | "done" | "error" | "cancelled";
  progress: number | null; // 0..1, null = indeterminate
  message?: string;
  error?: string;
  savedTo?: string; // when streamed straight to disk
  controller: AbortController;
}

export type JobResult = { blob: Blob; filename: string } | { savedTo: string };

export interface JobContext {
  signal: AbortSignal;
  progress: (fraction: number | null, message?: string) => void;
}

let jobs: Job[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const patch = (id: string, p: Partial<Job>) => {
  jobs = jobs.map((j) => (j.id === id ? { ...j, ...p } : j));
  emit();
};

export function useJobs() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => jobs,
    () => jobs,
  );
}

export const isBusy = () => jobs.some((j) => j.status === "running");

export function startJob(kind: JobKind, label: string, run: (ctx: JobContext) => Promise<JobResult>) {
  const controller = new AbortController();
  const id = Math.random().toString(36).slice(2);
  // Keep running jobs plus the last few finished ones.
  const finished = jobs.filter((j) => j.status !== "running").slice(-3);
  jobs = [...jobs.filter((j) => j.status === "running"), ...finished, { id, kind, label, status: "running", progress: 0, controller }];
  emit();

  // Progress updates are throttled so React isn't re-rendering on every frame.
  let last = 0;
  const progress: JobContext["progress"] = (fraction, message) => {
    const now = performance.now();
    if (fraction !== null && fraction < 1 && now - last < 100 && !message) return;
    last = now;
    patch(id, { progress: fraction, ...(message ? { message } : {}) });
  };

  run({ signal: controller.signal, progress })
    .then((res) => {
      if ("blob" in res) downloadBlob(res.blob, res.filename);
      patch(id, { status: "done", progress: 1, message: undefined, savedTo: "savedTo" in res ? res.savedTo : undefined });
    })
    .catch((e: unknown) => {
      if (controller.signal.aborted || (e as Error)?.name === "AbortError") patch(id, { status: "cancelled", message: undefined });
      else patch(id, { status: "error", error: friendlyError(e), message: undefined });
    });
  return id;
}

export const cancelJob = (id: string) => jobs.find((j) => j.id === id)?.controller.abort();
export const dismissJob = (id: string) => {
  jobs = jobs.filter((j) => j.id !== id);
  emit();
};

/** Turns low-level encoder/canvas failures into something actionable. */
export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const name = e instanceof Error ? e.name : "";
  if (/[áéíóú¿]/i.test(msg) || /^(Este|No se|El |La |Necesitas)/.test(msg)) return msg; // already ours, in Spanish
  if (name === "QuotaExceededError" || /memory|allocation|out of memory/i.test(msg))
    return "Se acabó la memoria del navegador. Prueba una resolución o fps menores, un loop más corto, o usa Chrome para guardar directo al disco.";
  if (name === "EncodingError" || /encod|codec|VideoEncoder/i.test(msg))
    return "El codificador de video de tu equipo no pudo con esta combinación. Baja la resolución o los fps, o cambia de códec (HEVC ↔ H.264).";
  if (/canvas|getContext|context/i.test(msg)) return "El navegador no pudo crear un lienzo tan grande. Safari llega hasta ~16.7 MP: baja la resolución o usa Chrome.";
  return `No se pudo exportar: ${msg}`;
}

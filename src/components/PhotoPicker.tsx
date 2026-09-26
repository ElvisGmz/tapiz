"use client";

import { Link2, Loader2, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type PhotoMeta, addPhoto, deletePhoto, listPhotos, photoFromUrl } from "@/lib/photos";
import { key } from "@/lib/platform";
import { cx } from "./ui";

export function PhotoPicker({
  selected,
  onChange,
  single,
}: {
  selected: string[];
  onChange: (ids: string[], picked?: PhotoMeta[]) => void;
  single?: boolean;
}) {
  const [library, setLibrary] = useState<PhotoMeta[] | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listPhotos().then(setLibrary).catch(() => setLibrary([]));
  }, []);

  const addPhotos = (photos: PhotoMeta[]) => {
    const ids = photos.map((p) => p.id);
    onChange(single ? ids.slice(-1) : [...new Set([...selected, ...ids])], photos);
  };

  const run = async (job: () => Promise<PhotoMeta[]>) => {
    setBusy(true);
    setError(null);
    try {
      const added = await job();
      setLibrary(await listPhotos());
      addPhotos(added);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const toggle = (p: PhotoMeta) => {
    if (single) return onChange([p.id], [p]);
    if (selected.includes(p.id)) onChange(selected.filter((x) => x !== p.id));
    else onChange([...selected, p.id], [p]);
  };

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-1.5">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-white/8 py-2 text-xs text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/12"
        >
          <Upload size={13} /> Subir fotos
        </button>
        <div className="flex items-center justify-center rounded-lg py-2 text-center text-[11px] leading-tight text-zinc-500 ring-1 ring-dashed ring-white/10">
          o pega con {key("V")} / arrastra al lienzo
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          if (files.length) run(() => Promise.all(files.map((f) => addPhoto(f, f.name.replace(/\.[^.]+$/, "")))));
        }}
      />
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <Link2 size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            className="tz-input w-full pl-7"
            placeholder="Pega el link de una imagen (.png, .jpg…)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && url.trim() && run(async () => [await photoFromUrl(url)]).then(() => setUrl(""))}
          />
        </div>
        <button
          disabled={!url.trim() || busy}
          onClick={() => run(async () => [await photoFromUrl(url)]).then(() => setUrl(""))}
          className="rounded-lg bg-white/8 px-3 text-xs text-zinc-200 hover:bg-white/15 disabled:opacity-40"
        >
          Traer
        </button>
      </div>
      {busy && (
        <p className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Loader2 size={12} className="animate-spin" /> Procesando imagen…
        </p>
      )}
      {error && <p className="rounded-lg bg-red-500/10 p-2 text-xs text-red-200">{error}</p>}

      <div className="tz-scroll grid max-h-56 grid-cols-4 gap-1.5 overflow-y-auto rounded-lg bg-black/20 p-1.5">
        {library === null && <p className="col-span-4 p-3 text-center text-xs text-zinc-500">Cargando…</p>}
        {library?.length === 0 && <p className="col-span-4 p-3 text-center text-xs leading-relaxed text-zinc-500">Tu biblioteca está vacía. Las fotos se guardan solo en este navegador.</p>}
        {library?.map((p) => {
          const on = selected.includes(p.id);
          return (
            <div key={p.id} className="group relative">
              <button
                title={p.name}
                onClick={() => toggle(p)}
                className={cx(
                  "block aspect-square w-full overflow-hidden rounded-md ring-2 transition",
                  p.hasAlpha && "tz-checker",
                  on ? "ring-violet-400" : "ring-transparent hover:ring-white/30",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumb} alt={p.name} className={cx("h-full w-full", p.hasAlpha ? "object-contain p-1" : "object-cover")} />
              </button>
              {on && <span className="pointer-events-none absolute left-1 top-1 h-3 w-3 rounded-full bg-violet-500 ring-2 ring-zinc-900" />}
              <button
                title="Borrar de la biblioteca"
                onClick={async () => {
                  await deletePhoto(p.id);
                  onChange(selected.filter((x) => x !== p.id));
                  setLibrary(await listPhotos());
                }}
                className="absolute right-0.5 top-0.5 hidden rounded bg-black/70 p-1 text-zinc-300 hover:text-red-300 group-hover:block"
              >
                <Trash2 size={11} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

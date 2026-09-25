"use client";

import { useEffect, useRef, useState } from "react";
import { preloadAssets } from "@/lib/render/assets";
import { renderWallpaper } from "@/lib/render";
import { docIsAnimated } from "@/lib/render/motion";
import { appearanceIndexes, sceneAtHour, switchScene, syncScenes } from "@/lib/scenes";
import { readShareHash } from "@/lib/store";
import type { WallpaperDoc } from "@/lib/types";

/**
 * Full-screen live wallpaper. Meant for apps like Plash that use a web page as the desktop:
 * it loops the animation and, for day/night designs, follows macOS appearance or the clock.
 */
export default function LivePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [doc, setDoc] = useState<WallpaperDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sceneIndex, setSceneIndex] = useState(0);

  useEffect(() => {
    const load = () =>
      readShareHash()
        .then((d) => (d ? setDoc(d) : setError("Este link no trae ningún diseño. Cópialo desde Tapiz → Descargar → Link en vivo.")))
        .catch(() => setError("El link está dañado."));
    load();
    window.addEventListener("hashchange", load);
    return () => window.removeEventListener("hashchange", load);
  }, []);

  // Pick the scene: follows dark mode or the time of day.
  useEffect(() => {
    if (!doc?.scenes?.length) return;
    const scenes = syncScenes(doc);
    const dark = matchMedia("(prefers-color-scheme: dark)");
    const pick = () => {
      if (doc.dynamicMode === "time") {
        const now = new Date();
        setSceneIndex(sceneAtHour(scenes, now.getHours() + now.getMinutes() / 60));
      } else {
        const { light, dark: d } = appearanceIndexes(scenes);
        setSceneIndex(dark.matches ? d : light);
      }
    };
    pick();
    dark.addEventListener("change", pick);
    const timer = setInterval(pick, 30_000);
    return () => {
      dark.removeEventListener("change", pick);
      clearInterval(timer);
    };
  }, [doc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !doc) return;
    const design = doc.scenes?.length ? switchScene(doc, sceneIndex) : doc;
    let raf = 0;
    let alive = true;
    const size = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(innerWidth * dpr);
      canvas.height = Math.round(innerHeight * dpr);
    };
    size();
    const ctx = canvas.getContext("2d")!;
    const animated = docIsAnimated(design);
    const start = performance.now();
    const frame = (now: number) => {
      if (!alive) return;
      renderWallpaper(ctx, design, canvas.width, canvas.height, animated ? (now - start) / 1000 : 0);
      if (animated) raf = requestAnimationFrame(frame);
    };
    const redraw = () => {
      size();
      if (!animated) requestAnimationFrame(frame);
    };
    preloadAssets(design).then(() => (raf = requestAnimationFrame(frame)));
    addEventListener("resize", redraw);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      removeEventListener("resize", redraw);
    };
  }, [doc, sceneIndex]);

  return (
    <div className="fixed inset-0 bg-black">
      <canvas ref={canvasRef} className="block h-full w-full" />
      {error && <p className="absolute inset-0 flex items-center justify-center p-8 text-center text-sm text-zinc-400">{error}</p>}
    </div>
  );
}

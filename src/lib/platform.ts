"use client";

/** Which OS the visitor is on, so texts, shortcuts and export defaults fit them (Mac, Windows, Android…). */
export type Platform = "mac" | "windows" | "ios" | "android" | "linux" | "other";

let cached: Platform | null = null;

export function getPlatform(): Platform {
  if (cached) return cached;
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  const hint = (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? "";
  if (/android/i.test(ua)) cached = "android";
  // iPadOS reports itself as a Mac; touch support gives it away.
  else if (/iphone|ipad|ipod/i.test(ua) || (/mac/i.test(hint) && navigator.maxTouchPoints > 1)) cached = "ios";
  else if (/mac/i.test(hint) || /Mac OS X/.test(ua)) cached = "mac";
  else if (/win/i.test(hint) || /Windows/.test(ua)) cached = "windows";
  else if (/linux|cros/i.test(hint) || /Linux|CrOS/.test(ua)) cached = "linux";
  else cached = "other";
  return cached;
}

export const isApple = (p = getPlatform()) => p === "mac" || p === "ios";

/** Shortcut label, e.g. key("Z") → "⌘Z" or "Ctrl+Z"; key("Z", true) → "⇧⌘Z" or "Ctrl+Shift+Z". */
export function key(k: string, shift = false, p = getPlatform()) {
  return isApple(p) ? `${shift ? "⇧" : ""}⌘${k}` : `Ctrl+${shift ? "Shift+" : ""}${k}`;
}

/** How to use an animated wallpaper on each system. */
export function animatedHowTo(p = getPlatform()) {
  switch (p) {
    case "mac":
      return { app: "Plash", url: "https://sindresorhus.com/plash", liveHint: "Pégalo en Plash → Add Website" };
    case "windows":
      return { app: "Lively Wallpaper", url: "https://www.rocksdanister.com/lively/", liveHint: "Pégalo en Lively → Añadir → URL" };
    default:
      return null;
  }
}

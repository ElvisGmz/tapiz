"use client";

import { useSyncExternalStore } from "react";

/** Live `matchMedia` result; re-renders when it flips (rotating a tablet, resizing a window). */
export function useMedia(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const m = matchMedia(query);
      m.addEventListener("change", onChange);
      return () => m.removeEventListener("change", onChange);
    },
    () => matchMedia(query).matches,
    () => true,
  );
}

/** Three-column editor from 1024px up; below that, the mobile layout with bottom sheets. */
export const useIsDesktop = () => useMedia("(min-width: 1024px)");

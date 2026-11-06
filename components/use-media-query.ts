"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * True while a CSS media query matches. The server snapshot is `false`, so server HTML and the
 * hydration pass match; the client value applies right after hydration.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

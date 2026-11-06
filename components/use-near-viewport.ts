"use client";

import { useEffect, useRef, useState } from "react";

export function useNearViewport<T extends Element>() {
  const ref = useRef<T>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const Observer = Reflect.get(window, "IntersectionObserver") as typeof IntersectionObserver | undefined;
    if (!Observer) {
      const timeout = window.setTimeout(() => setIsNearViewport(true), 0);
      return () => window.clearTimeout(timeout);
    }

    const observer = new Observer(([entry]) => {
      if (entry.isIntersecting) {
        setIsNearViewport(true);
        observer.disconnect();
      }
    }, { rootMargin: "300px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, isNearViewport };
}

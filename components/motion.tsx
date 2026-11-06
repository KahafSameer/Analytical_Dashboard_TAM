"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: reduceMotion ? 0.15 : 0.44, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function useChartEntrance() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "80px 0px" });
  const reduceMotion = useReducedMotion();
  return { ref, isInView, animate: isInView && !reduceMotion };
}

/**
 * Entrance trigger for hand-built (non-Recharts) visuals. Put `ref` and `data-reveal={state}` on
 * the container; CSS in globals.css grows bars, fades heatmap cells and fills rings once it scrolls
 * into view. Server and first client render are both "pending", so hydration matches.
 */
export function useReveal<T extends Element = HTMLDivElement>(amount = 0.15) {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { once: true, amount });
  return { ref, revealState: inView ? "shown" : "pending" } as const;
}

/** Stagger position for an element inside a reveal container (each step adds a short delay). */
export function revealIndex(index: number): CSSProperties {
  return { ["--reveal-index" as string]: index } as CSSProperties;
}

export { motion, useReducedMotion };

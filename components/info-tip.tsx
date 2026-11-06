"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";

const MARGIN = 10;
const GAP = 6;

/**
 * Small ⓘ button that explains a chart, number or term in plain words. Opens on click/tap (works
 * on phones), closes on Escape or an outside tap, and is portalled so cards cannot clip it.
 */
export function InfoTip({
  title,
  children,
  guideAnchor,
  label,
}: {
  title: string;
  children: ReactNode;
  /** Section id on /guide for "Learn more". */
  guideAnchor?: string;
  /** Accessible name for the button; defaults to "What does {title} mean?". */
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const place = useCallback(() => {
    const button = buttonRef.current;
    const panel = panelRef.current;
    if (!button || !panel) return;
    const rect = button.getBoundingClientRect();
    const { offsetWidth: width, offsetHeight: height } = panel;
    const below = window.innerHeight - rect.bottom >= height + GAP + MARGIN;
    const top = below ? rect.bottom + GAP : Math.max(MARGIN, rect.top - height - GAP);
    const left = Math.min(Math.max(MARGIN, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - MARGIN);
    panel.style.top = `${Math.round(top)}px`;
    panel.style.left = `${Math.round(Math.max(MARGIN, left))}px`;
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onResize = () => setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`info-tip-button${open ? " is-open" : ""}`}
        aria-label={label ?? `What does “${title}” mean?`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={(event) => { event.stopPropagation(); setOpen((current) => !current); }}
      >
        <Info size={13} aria-hidden="true" />
      </button>
      {open && createPortal(
        <div ref={panelRef} id={panelId} role="note" className="info-tip-panel">
          <strong>{title}</strong>
          <p>{children}</p>
          {guideAnchor && <Link href={`/guide#${guideAnchor}`} className="info-tip-link" onClick={() => setOpen(false)}>Learn more in the guide →</Link>}
        </div>,
        document.body,
      )}
    </>
  );
}

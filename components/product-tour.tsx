"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { placeTooltip, spotlightRect, targetScrollTop, type TourStep } from "@/lib/tour";

const PHONE_QUERY = "(max-width: 760px)";
const PHONE_HEADER = 55;
const subscribeNothing = () => () => {};
const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

function isShown(element: Element | null): element is HTMLElement {
  return element instanceof HTMLElement && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";
}

function isFixed(element: HTMLElement): boolean {
  for (let node: HTMLElement | null = element; node; node = node.parentElement) {
    if (getComputedStyle(node).position === "fixed") return true;
  }
  return false;
}

/** Finds the step's element, scrolling to its section first when it is rendered lazily. */
async function findTarget(step: TourStep, phone: boolean, cancelled: () => boolean): Promise<HTMLElement | null> {
  const selector = (phone && step.phoneTarget) || step.target;
  if (!selector) return null;
  const now = document.querySelector(selector);
  if (isShown(now)) return now;
  if (step.scrollHint) document.querySelector(step.scrollHint)?.scrollIntoView({ block: "start" });
  for (let attempt = 0; attempt < 25 && !cancelled(); attempt += 1) {
    await wait(200);
    const found = document.querySelector(selector);
    if (isShown(found)) return found;
  }
  return null;
}

/** Resolves once the page has stopped scrolling (or after ~1.2 s). */
async function scrollSettled() {
  let last = -1;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await wait(60);
    if (Math.abs(window.scrollY - last) < 1) return;
    last = window.scrollY;
  }
}

/**
 * Step-by-step guided tour: dims the page, spotlights one element at a time and explains it in a
 * small box with Back / Next / Skip. Keyboard: → next, ← back, Esc closes; focus stays in the
 * box and returns to where it was afterwards. Mount with a new `key` to restart from step one.
 */
export function ProductTour({
  steps,
  open,
  onClose,
  label = "Guided tour",
}: {
  steps: TourStep[];
  open: boolean;
  onClose: (completed: boolean) => void;
  label?: string;
}) {
  const isClient = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const [index, setIndex] = useState(0);
  const direction = useRef<1 | -1>(1);
  const spotRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const frame = useRef(0);
  const titleId = useId();
  const bodyId = useId();
  const step = steps[Math.min(index, steps.length - 1)];
  const isLast = index >= steps.length - 1;

  /** Writes spotlight and box positions straight to the DOM (no re-render while scrolling). */
  const layout = useCallback(() => {
    const spot = spotRef.current;
    const box = boxRef.current;
    if (!spot || !box) return;
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const phone = window.matchMedia(PHONE_QUERY).matches;
    const target = targetRef.current?.isConnected ? targetRef.current : null;
    let targetRect = null;
    if (target) {
      const rect = target.getBoundingClientRect();
      targetRect = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
      const area = spotlightRect(targetRect, viewport);
      spot.dataset.empty = area.width && area.height ? "false" : "true";
      spot.style.transform = `translate(${area.left}px, ${area.top}px)`;
      spot.style.width = `${area.width}px`;
      spot.style.height = `${area.height}px`;
    } else {
      spot.dataset.empty = "true";
      spot.style.transform = `translate(${viewport.width / 2}px, ${viewport.height / 2}px)`;
      spot.style.width = "0px";
      spot.style.height = "0px";
    }
    box.dataset.phone = phone ? "true" : "false";
    if (phone) {
      box.style.top = "";
      box.style.left = "";
      // The sheet normally sits at the bottom; move it to the top when the highlighted element is
      // down there (e.g. the floating AI Assistant button) so it never covers what it explains.
      const sheetHeight = box.offsetHeight;
      const coversTarget = targetRect !== null
        && targetRect.top + targetRect.height > viewport.height - sheetHeight - 8
        && targetRect.top > sheetHeight + 8;
      box.dataset.sheet = coversTarget ? "top" : "bottom";
      return;
    }
    const position = placeTooltip(targetRect, { width: box.offsetWidth, height: box.offsetHeight }, viewport);
    box.style.top = `${Math.round(position.top)}px`;
    box.style.left = `${Math.round(position.left)}px`;
    box.dataset.placement = position.placement;
  }, []);

  const scheduleLayout = useCallback(() => {
    window.cancelAnimationFrame(frame.current);
    frame.current = window.requestAnimationFrame(layout);
  }, [layout]);

  const next = useCallback(() => {
    if (isLast) {
      onClose(true);
      return;
    }
    direction.current = 1;
    setIndex((current) => Math.min(current + 1, steps.length - 1));
  }, [isLast, onClose, steps.length]);

  const back = useCallback(() => {
    direction.current = -1;
    setIndex((current) => Math.max(current - 1, 0));
  }, []);

  // Move to the step's element: wait for it, scroll it into a good spot, then show the box.
  useEffect(() => {
    if (!open || !isClient) return;
    let cancelled = false;
    const box = boxRef.current;
    box?.setAttribute("data-ready", "false");
    (async () => {
      const phone = window.matchMedia(PHONE_QUERY).matches;
      const current = steps[index];
      const target = await findTarget(current, phone, () => cancelled);
      if (cancelled) return;
      if (current.target && !target) {
        // Not on the page (e.g. card view, no related projects): skip it in the same direction.
        const skipTo = index + direction.current;
        if (skipTo >= 0 && skipTo < steps.length) {
          setIndex(skipTo);
          return;
        }
      }
      targetRef.current = target;
      if (target && !isFixed(target)) {
        const rect = target.getBoundingClientRect();
        const top = targetScrollTop(
          { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
          window.scrollY,
          { width: window.innerWidth, height: window.innerHeight },
          phone,
          phone ? PHONE_HEADER : 0,
        );
        if (Math.abs(top - window.scrollY) > 4) {
          window.scrollTo({ top });
          await scrollSettled();
        }
      }
      if (cancelled) return;
      layout();
      box?.setAttribute("data-ready", "true");
      nextRef.current?.focus({ preventScroll: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [open, index, isClient, steps, layout]);

  // Latest handlers for the keyboard listener, which is attached once per opening.
  const handlers = useRef({ next, back, onClose });
  useEffect(() => {
    handlers.current = { next, back, onClose };
  });

  // Keep the spotlight on its element while the page scrolls or resizes; keyboard controls.
  // Attached once while open, so focus is restored to where it was only when the tour closes.
  useEffect(() => {
    if (!open || !isClient) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handlers.current.onClose(false);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        handlers.current.next();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        handlers.current.back();
      } else if (event.key === "Tab") {
        const focusable = [...(boxRef.current?.querySelectorAll<HTMLElement>("button") ?? [])];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        } else if (!boxRef.current?.contains(document.activeElement)) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", scheduleLayout, true);
    window.addEventListener("resize", scheduleLayout);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", scheduleLayout, true);
      window.removeEventListener("resize", scheduleLayout);
      window.cancelAnimationFrame(frame.current);
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open, isClient, scheduleLayout]);

  if (!isClient || !open || !step) return null;

  return createPortal(
    <div className="tour-root">
      <div className="tour-blocker" aria-hidden="true" />
      <div ref={spotRef} className="tour-spotlight" data-empty="true" aria-hidden="true" />
      <div
        ref={boxRef}
        className="tour-box"
        role="dialog"
        aria-modal="true"
        aria-roledescription={label}
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        data-ready="false"
      >
        <div className="tour-head">
          <span className="tour-count">Step {index + 1} of {steps.length}</span>
          <button type="button" className="tour-close" aria-label="Close the tour" onClick={() => onClose(false)}><X size={16} /></button>
        </div>
        <h2 id={titleId} className="tour-title">{step.title}</h2>
        <p id={bodyId} className="tour-body">{step.body}</p>
        <div className="tour-dots" aria-hidden="true">
          {steps.map((entry, position) => <i key={entry.id} className={position === index ? "is-active" : position < index ? "is-done" : ""} />)}
        </div>
        <div className="tour-actions">
          <button type="button" className="tour-skip" onClick={() => onClose(false)}>{isLast ? "Close" : "Skip tour"}</button>
          <div className="tour-nav">
            {index > 0 && <button type="button" className="button button-outline" onClick={back}><ArrowLeft size={15} /> Back</button>}
            <button ref={nextRef} type="button" className="button button-primary" onClick={next}>
              {isLast ? <><Check size={15} /> Finish</> : <>Next <ArrowRight size={15} /></>}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

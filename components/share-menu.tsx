"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Link2, Mail, MessageCircle, Printer, Send, Share2 } from "lucide-react";
import {
  SHARE_PLATFORMS,
  buildShareUrl,
  composeShareMessage,
  type SharePayload,
  type SharePlatform,
} from "@/lib/share";

const PLATFORM_ICONS: Record<SharePlatform, ReactNode> = {
  whatsapp: <MessageCircle size={13} strokeWidth={2.4} />,
  facebook: <b>f</b>,
  x: <b>X</b>,
  linkedin: <b>in</b>,
  telegram: <Send size={12} strokeWidth={2.4} />,
  email: <Mail size={13} strokeWidth={2.2} />,
};

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers or contexts without the async clipboard API.
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    return copied;
  }
}

type ShareMenuProps = {
  /** Builds the payload at open time; `url` defaults to the current page. */
  getPayload: (pageUrl: string) => SharePayload;
  label?: string;
  /** Icon-only trigger (used inside the assistant). */
  compact?: boolean;
  /** Platforms to offer; defaults to all. */
  platforms?: SharePlatform[];
  className?: string;
};

const VIEWPORT_MARGIN = 8;
const TRIGGER_GAP = 6;

/**
 * Share button with a menu: the device share sheet (when supported), WhatsApp and other
 * platforms, and copy actions. Links open in a new tab; nothing is sent until the user picks one.
 * The menu is portalled to <body> with fixed coordinates, so scrolling containers (the assistant's
 * message list) cannot clip it; it opens below the button, or above when there is no room.
 */
export function ShareMenu({ getPayload, label = "Share", compact = false, platforms, className = "" }: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [copied, setCopied] = useState<"link" | "text" | null>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const offered = SHARE_PLATFORMS.filter((platform) => !platforms || platforms.includes(platform.id));

  useEffect(() => {
    // Feature-detect after mount so server and client markup match.
    const timer = window.setTimeout(() => setCanNativeShare(typeof navigator.share === "function"), 0);
    return () => window.clearTimeout(timer);
  }, []);

  /** Positions the portalled menu next to the trigger, flipping above and clamping to the viewport. */
  const place = useCallback(() => {
    const button = buttonRef.current;
    const menu = menuRef.current;
    if (!button || !menu) return;
    const rect = button.getBoundingClientRect();
    const { offsetWidth: width, offsetHeight: height } = menu;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= height + TRIGGER_GAP + VIEWPORT_MARGIN
      ? rect.bottom + TRIGGER_GAP
      : rect.top >= height + TRIGGER_GAP + VIEWPORT_MARGIN
        ? rect.top - height - TRIGGER_GAP
        : Math.max(VIEWPORT_MARGIN, window.innerHeight - height - VIEWPORT_MARGIN);
    const left = Math.min(Math.max(VIEWPORT_MARGIN, rect.right - width), window.innerWidth - width - VIEWPORT_MARGIN);
    // Written to the DOM directly (not state) so placement happens before paint without a re-render.
    menu.style.top = `${Math.round(top)}px`;
    menu.style.left = `${Math.round(Math.max(VIEWPORT_MARGIN, left))}px`;
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, payload, place]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!wrapperRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    // A resize (e.g. rotating a phone) can re-lay out the page under the menu: close it instead of guessing.
    const closeOnResize = () => setOpen(false);
    document.addEventListener("pointerdown", closeOnOutside);
    window.addEventListener("resize", closeOnResize);
    window.addEventListener("scroll", place, true);
    const focusTimer = window.setTimeout(() => menuRef.current?.querySelector<HTMLElement>("[role='menuitem']")?.focus(), 0);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      window.removeEventListener("resize", closeOnResize);
      window.removeEventListener("scroll", place, true);
      window.clearTimeout(focusTimer);
    };
  }, [open, place]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 1_800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setPayload(getPayload(window.location.href));
    setOpen(true);
  }

  function close(returnFocus = true) {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']") ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = event.key === "ArrowDown" ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
      items[next]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      items[event.key === "Home" ? 0 : items.length - 1]?.focus();
    } else if (event.key === "Tab") {
      // The menu lives at the end of <body>; send focus back to its button rather than off the page.
      event.preventDefault();
      close();
    }
  }

  async function nativeShare() {
    if (!payload) return;
    try {
      await navigator.share({ title: payload.title, text: composeShareMessage({ ...payload, url: "" }), url: payload.url });
      close();
    } catch {
      // Cancelled by the user, or not permitted: keep the menu open for another option.
    }
  }

  async function copy(kind: "link" | "text") {
    if (!payload) return;
    if (await copyText(kind === "link" ? payload.url : composeShareMessage(payload))) setCopied(kind);
  }

  return (
    <div className={`share-menu${className ? ` ${className}` : ""}`} ref={wrapperRef}>
      <button
        ref={buttonRef}
        type="button"
        className={compact ? "assistant-icon-action" : "button button-outline share-trigger"}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={compact ? label : undefined}
        title={compact ? label : undefined}
        onClick={toggle}
      >
        <Share2 size={compact ? 13 : 15} />
        {!compact && <span>{label}</span>}
      </button>
      {open && payload && createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          className="share-popover"
          onKeyDown={onMenuKeyDown}
        >
          <p className="share-popover-title" aria-hidden="true">Share “{payload.title.length > 60 ? `${payload.title.slice(0, 59)}…` : payload.title}”</p>
          {canNativeShare && (
            <button type="button" role="menuitem" className="share-item" onClick={() => void nativeShare()}>
              <span className="share-icon share-icon-native"><Share2 size={13} /></span>Share via…
            </button>
          )}
          {offered.map((platform) => (
            <a
              key={platform.id}
              role="menuitem"
              className="share-item"
              href={buildShareUrl(platform.id, payload)}
              {...(platform.id === "email" ? {} : { target: "_blank", rel: "noopener noreferrer" })}
              onClick={() => close(false)}
            >
              <span className={`share-icon share-icon-${platform.id}`} aria-hidden="true">{PLATFORM_ICONS[platform.id]}</span>
              {platform.label}
            </a>
          ))}
          <div className="share-divider" role="separator" />
          <button type="button" role="menuitem" className="share-item" onClick={() => void copy("link")}>
            <span className="share-icon share-icon-copy">{copied === "link" ? <Check size={13} /> : <Link2 size={13} />}</span>
            {copied === "link" ? "Link copied" : "Copy link"}
          </button>
          <button type="button" role="menuitem" className="share-item" onClick={() => void copy("text")}>
            <span className="share-icon share-icon-copy">{copied === "text" ? <Check size={13} /> : <Copy size={13} />}</span>
            {copied === "text" ? "Summary copied" : "Copy summary text"}
          </button>
          <span className="sr-only" role="status" aria-live="polite">{copied ? `${copied === "link" ? "Link" : "Summary"} copied to clipboard` : ""}</span>
        </div>,
        document.body,
      )}
    </div>
  );
}

/** Opens the browser print dialog; print styles hide navigation and controls (Save as PDF works too). */
export function PrintButton({ label = "Print / PDF" }: { label?: string }) {
  return (
    <button type="button" className="button button-outline print-trigger" onClick={() => window.print()}>
      <Printer size={15} />
      <span>{label}</span>
    </button>
  );
}

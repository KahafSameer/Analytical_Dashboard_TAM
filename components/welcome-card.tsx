"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { BookOpen, Compass, X } from "lucide-react";
import { motion } from "motion/react";
import { ATTENTION_COLOR, SERIES_COLORS } from "@/lib/chart-theme";

const STORAGE_KEY = "fieldnotes-welcome-dismissed";
const CHANGE_EVENT = "fieldnotes-welcome-change";
// Fallback when storage is blocked (private mode): dismissal still lasts for this visit.
let dismissedThisVisit = false;

function readDismissed(): boolean {
  if (dismissedThisVisit) return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function dismiss() {
  dismissedThisVisit = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Storage unavailable: the in-memory flag keeps it hidden for this visit.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * First-visit orientation: the money journey, the colors and where to get help. Rendered only in
 * the browser (server snapshot = dismissed), so returning visitors never see it flash.
 */
export function WelcomeCard() {
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => true);
  if (dismissed) return null;
  return (
    <motion.section
      className="welcome-card"
      aria-labelledby="welcome-title"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="welcome-icon" aria-hidden="true"><Compass size={20} /></span>
      <div className="welcome-body">
        <h2 id="welcome-title">New here? How to read this dashboard in 30 seconds</h2>
        <ol className="welcome-steps">
          <li><strong>Money moves in four steps:</strong> Approved budget → Allocated (set aside) → Released (handed over) → Spent.</li>
          <li>
            <strong>Colors:</strong>{" "}
            <span className="welcome-swatch"><i style={{ backgroundColor: SERIES_COLORS.allocation }} />set aside</span>
            <span className="welcome-swatch"><i style={{ backgroundColor: SERIES_COLORS.release }} />handed over</span>
            <span className="welcome-swatch"><i style={{ backgroundColor: SERIES_COLORS.utilized }} />spent</span>
            <span className="welcome-swatch"><i style={{ backgroundColor: ATTENTION_COLOR }} />needs attention</span>
          </li>
          <li><strong>Need help?</strong> Tap <span className="welcome-info" aria-label="the info button">i</span> next to any chart or number for a simple explanation.</li>
        </ol>
        <div className="welcome-actions">
          <Link href="/guide" className="button button-primary"><BookOpen size={15} /> Read the 2-minute guide</Link>
          <button type="button" className="button button-outline" onClick={dismiss}>Got it</button>
        </div>
      </div>
      <button type="button" className="welcome-close" aria-label="Close the welcome message" onClick={dismiss}><X size={16} /></button>
    </motion.section>
  );
}

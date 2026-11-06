/**
 * Whether the first-visit welcome card has been dismissed. Stored in localStorage, with an
 * in-memory fallback when storage is blocked. Browser-only: call these from effects or handlers.
 */

export const WELCOME_STORAGE_KEY = "fieldnotes-welcome-dismissed";
const CHANGE_EVENT = "fieldnotes-welcome-change";
let dismissedThisVisit = false;

export function isWelcomeDismissed(): boolean {
  if (dismissedThisVisit) return true;
  try {
    return window.localStorage.getItem(WELCOME_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Hides the welcome card from now on (also used when the visitor opens the guide). */
export function dismissWelcome(): void {
  dismissedThisVisit = true;
  try {
    window.localStorage.setItem(WELCOME_STORAGE_KEY, "1");
  } catch {
    // Storage unavailable: the in-memory flag keeps it hidden for this visit.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeWelcome(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

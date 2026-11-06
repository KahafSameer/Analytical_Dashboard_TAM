/** Hosts whose links are always safe to show (maps and encyclopedia references). */
const TRUSTED_HOSTS = [
  "www.google.com",
  "maps.google.com",
  "www.openstreetmap.org",
  "openstreetmap.org",
  "en.wikipedia.org",
  "ur.wikipedia.org",
];

export type ResolvedLink = { kind: "internal"; href: string } | { kind: "external"; href: string } | null;

/**
 * Decides whether a link written by the model may be rendered as clickable.
 * Allowed: dashboard paths (/sites/...), trusted map/encyclopedia hosts, and URLs that
 * appeared in this answer's tool results. Anything else is rendered as plain text, so an
 * invented or injected URL can never become a clickable link.
 */
export function resolveAnswerLink(rawHref: string, knownUrls: ReadonlySet<string>): ResolvedLink {
  const href = rawHref.trim();
  if (/^\/sites\/[A-Za-z0-9._~-]+\/?$/.test(href)) return { kind: "internal", href };
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  if (knownUrls.has(url.href) || knownUrls.has(href)) return { kind: "external", href: url.href };
  if (TRUSTED_HOSTS.includes(url.hostname)) {
    // google.com is only trusted for Maps links.
    if (url.hostname === "www.google.com" && !url.pathname.startsWith("/maps")) return null;
    return { kind: "external", href: url.href };
  }
  return null;
}

/** Normalized http(s) URLs written in free text (trailing punctuation removed). */
export function extractUrls(text: string): string[] {
  const urls: string[] = [];
  for (const match of text.matchAll(/https?:\/\/[^\s<>"'`]{1,2048}/gi)) {
    const candidate = match[0].replace(/[),.;:!?\]}’”]+$/u, "");
    try {
      urls.push(new URL(candidate).href);
    } catch {
      // not a valid URL
    }
  }
  return urls;
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

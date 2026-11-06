import { formatMillions, formatPercent } from "@/lib/analytics";
import type { AnalyticsSummary, Site } from "@/lib/types";

/**
 * Share links and share text. Pure (no window access) so it can be unit tested; the share menu
 * supplies the page URL at click time.
 */

export type SharePlatform = "whatsapp" | "facebook" | "x" | "linkedin" | "telegram" | "email";
export type SharePayload = {
  /** One-line headline (project name, view name or question). */
  title: string;
  /** Body lines without the title or URL. */
  text: string;
  url: string;
};

export const SHARE_PLATFORMS: { id: SharePlatform; label: string }[] = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "facebook", label: "Facebook" },
  { id: "x", label: "X (Twitter)" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "telegram", label: "Telegram" },
  { id: "email", label: "Email" },
];

const X_TEXT_LIMIT = 230;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastBreak = Math.max(cut.lastIndexOf(" "), cut.lastIndexOf("\n"));
  return `${(lastBreak > max * 0.6 ? cut.slice(0, lastBreak) : cut).trimEnd()}…`;
}

/** Text used when the message is copied or sent by WhatsApp-style apps. */
export function composeShareMessage(payload: SharePayload, boldTitle = false): string {
  const title = boldTitle ? `*${payload.title}*` : payload.title;
  return [title, payload.text, payload.url].filter((part) => part.trim()).join("\n\n");
}

export function buildShareUrl(platform: SharePlatform, payload: SharePayload): string {
  const encode = encodeURIComponent;
  switch (platform) {
    case "whatsapp":
      return `https://wa.me/?text=${encode(composeShareMessage(payload, true))}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encode(payload.url)}`;
    case "x":
      return `https://twitter.com/intent/tweet?text=${encode(truncate(payload.title, X_TEXT_LIMIT))}&url=${encode(payload.url)}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encode(payload.url)}`;
    case "telegram":
      return `https://t.me/share/url?url=${encode(payload.url)}&text=${encode([payload.title, payload.text].filter(Boolean).join("\n\n"))}`;
    case "email":
      return `mailto:?subject=${encode(payload.title)}&body=${encode([payload.text, payload.url].filter(Boolean).join("\n\n"))}`;
  }
}

/** Plain text from assistant Markdown: no bold markers, links as "label (url)", tables as rows. */
export function stripMarkdown(markdown: string): string {
  return markdown
    .split(/\r?\n/)
    .filter((line) => !/^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(line))
    .map((line) => {
      let text = line.replace(/<br\s*\/?>/gi, " ");
      if (/^\s*\|.*\|\s*$/.test(text)) {
        text = text.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()).filter(Boolean).join(" — ");
      }
      return text
        .replace(/^\s{0,3}#{1,6}\s+/, "")
        .replace(/^(\s*)[-*•]\s+/, "$1• ")
        .replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (_, label: string, url: string) => (label === url ? url : `${label} (${url})`))
        .replace(/\*\*([^*\n]+)\*\*/g, "$1")
        .replace(/(^|[^\w*])\*([^*\n]+)\*(?![\w*])/g, "$1$2")
        .replace(/`([^`\n]+)`/g, "$1")
        .trimEnd();
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function projectSharePayload(site: Site, url: string): SharePayload {
  const location = site.district && site.district !== "Not specified" ? ` (${site.district})` : "";
  return {
    title: `${site.name}${location}`,
    text: [
      `• Approved cost: ${formatMillions(site.approvedCost)}`,
      `• Released: ${formatMillions(site.released)} · Utilized: ${formatMillions(site.utilized)}`,
      `• Financial progress: ${formatPercent(site.overallProgress)} (utilized ÷ approved cost)`,
      "Source: Punjab tourism portfolio dashboard (Google Sheets, PKR millions)",
    ].join("\n"),
    url,
  };
}

export function portfolioSharePayload(
  summary: AnalyticsSummary,
  options: { total: number; selection?: string; url: string },
): SharePayload {
  const scope = options.selection
    ? `${summary.siteCount} of ${options.total} projects · ${options.selection}`
    : `${summary.siteCount} projects`;
  return {
    title: options.selection ? "Punjab tourism projects — filtered view" : "Punjab tourism portfolio",
    text: [
      `• ${scope}`,
      `• Approved cost: ${formatMillions(summary.totalApproved, 0)} · Released: ${formatMillions(summary.totalReleased, 0)}`,
      `• Utilized: ${formatMillions(summary.totalUtilized, 0)} · Financial progress: ${formatPercent(summary.weightedProgress)}`,
      `• ${summary.awaitingSpend} project${summary.awaitingSpend === 1 ? "" : "s"} with no spend recorded`,
    ].join("\n"),
    url: options.url,
  };
}

/** A question and its answer as plain text, short enough for messaging apps. */
export function assistantSharePayload(question: string | undefined, answer: string, url: string, maxAnswerChars = 1_200): SharePayload {
  const cleanQuestion = question?.replace(/\s+/g, " ").trim();
  return {
    title: cleanQuestion ? `Q: ${truncate(cleanQuestion, 200)}` : "From the tourism dashboard assistant",
    text: truncate(stripMarkdown(answer), maxAnswerChars),
    url,
  };
}

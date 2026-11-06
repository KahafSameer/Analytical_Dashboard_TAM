import type { AssistantWebSource } from "@/lib/assistant-context";
import { isValidCoordinate } from "@/lib/assistant/geo";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, "\"")
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function wikipediaUrl(title: string, lang = "en"): string {
  return `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(" ", "_"))}`;
}

/**
 * Wikipedia full-text search matches every term, so long natural-language queries often
 * return nothing. Produce the query followed by progressively shorter keyword versions.
 */
export function wikipediaQueryVariants(query: string): string[] {
  const words = query.replace(/[?!.,;:()"“”]/g, " ").split(/\s+/).filter(Boolean);
  const filler = /^(what|which|who|where|when|why|how|is|are|the|a|an|of|in|for|to|and|best|top|about|known|famous|visit|visiting|time|season|tell|me|information|info|details|latest|current|tourist|tourism|attractions?|places?|things|do|pakistan|punjab)$/i;
  const keywords = words.filter((word) => !filler.test(word));
  const variants = [words.join(" "), keywords.join(" "), keywords.slice(0, 3).join(" "), keywords.slice(0, 2).join(" ")];
  return [...new Set(variants.map((variant) => variant.trim()).filter((variant) => variant.length >= 3))];
}

/** Titles from a MediaWiki `list=search` response. */
export function parseWikipediaSearch(json: unknown): string[] {
  if (!isRecord(json) || !isRecord(json.query) || !Array.isArray(json.query.search)) return [];
  return json.query.search
    .map((entry) => (isRecord(entry) && typeof entry.title === "string" ? entry.title : null))
    .filter((title): title is string => Boolean(title));
}

/** Plain-text intro extracts from a MediaWiki `prop=extracts` response, keyed by title. */
export function parseWikipediaExtracts(json: unknown, maxChars = 1400): { title: string; extract: string }[] {
  if (!isRecord(json) || !isRecord(json.query) || !isRecord(json.query.pages)) return [];
  return Object.values(json.query.pages)
    .map((page) => {
      if (!isRecord(page) || typeof page.title !== "string" || typeof page.extract !== "string") return null;
      const extract = stripHtml(page.extract);
      if (!extract) return null;
      return { title: page.title, extract: extract.length > maxChars ? `${extract.slice(0, maxChars).trimEnd()}…` : extract };
    })
    .filter((page): page is { title: string; extract: string } => Boolean(page));
}

export type NearbyPlace = { title: string; distanceKm: number; url: string };

/** Nearby articles from a MediaWiki `list=geosearch` response. */
export function parseWikipediaGeosearch(json: unknown, lang = "en"): NearbyPlace[] {
  if (!isRecord(json) || !isRecord(json.query) || !Array.isArray(json.query.geosearch)) return [];
  return json.query.geosearch
    .map((entry) => {
      if (!isRecord(entry) || typeof entry.title !== "string" || typeof entry.dist !== "number") return null;
      return { title: entry.title, distanceKm: Number((entry.dist / 1000).toFixed(1)), url: wikipediaUrl(entry.title, lang) };
    })
    .filter((place): place is NearbyPlace => Boolean(place));
}

export type GeocodeResult = { name: string; address: string; latitude: number; longitude: number; kind: string };

/** Results from an OpenStreetMap Nominatim `format=jsonv2` search. */
export function parseNominatim(json: unknown): GeocodeResult[] {
  if (!Array.isArray(json)) return [];
  return json
    .map((entry) => {
      if (!isRecord(entry)) return null;
      const latitude = Number(entry.lat);
      const longitude = Number(entry.lon);
      if (!isValidCoordinate(latitude, longitude) || typeof entry.display_name !== "string") return null;
      const name = typeof entry.name === "string" && entry.name ? entry.name : entry.display_name.split(",")[0].trim();
      const kind = [entry.category, entry.type].filter((part) => typeof part === "string").join("/");
      return { name, address: entry.display_name, latitude, longitude, kind };
    })
    .filter((result): result is GeocodeResult => Boolean(result));
}

/** Web and Maps citations from a Gemini grounding metadata block, de-duplicated by URL. */
export function collectGroundingSources(metadata: unknown, limit = 8): AssistantWebSource[] {
  if (!isRecord(metadata) || !Array.isArray(metadata.groundingChunks)) return [];
  const seen = new Set<string>();
  const sources: AssistantWebSource[] = [];
  for (const chunk of metadata.groundingChunks) {
    if (!isRecord(chunk)) continue;
    const web = isRecord(chunk.web) ? chunk.web : null;
    const maps = isRecord(chunk.maps) ? chunk.maps : null;
    const entry = web ?? maps;
    if (!entry || typeof entry.uri !== "string" || !/^https?:\/\//i.test(entry.uri) || seen.has(entry.uri)) continue;
    seen.add(entry.uri);
    sources.push({
      title: typeof entry.title === "string" && entry.title ? entry.title : new URL(entry.uri).hostname,
      url: entry.uri,
      provider: maps ? "google_maps" : "google_search",
    });
    if (sources.length >= limit) break;
  }
  return sources;
}

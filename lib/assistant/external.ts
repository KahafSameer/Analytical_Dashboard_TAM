import "server-only";

import {
  parseNominatim,
  parseWikipediaExtracts,
  parseWikipediaGeosearch,
  parseWikipediaSearch,
  wikipediaQueryVariants,
  wikipediaUrl,
  type GeocodeResult,
  type NearbyPlace,
} from "@/lib/assistant/web-sources";

// OpenStreetMap / Wikimedia ask clients to identify themselves; set ASSISTANT_CONTACT to a
// deployment URL or contact address to include it.
const CONTACT = process.env.ASSISTANT_CONTACT?.trim().slice(0, 120);
const USER_AGENT = `FieldnotesTourismDashboard/1.0 (analytics assistant${CONTACT ? `; ${CONTACT}` : ""})`;
const FETCH_TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_LIMIT = 300;
const NOMINATIM_SPACING_MS = 1_100;
const NOMINATIM_MAX_PENDING = 6;

export class ExternalServiceBusyError extends Error {}

const cache = new Map<string, { expiresAt: number; value: unknown }>();
const inFlight = new Map<string, Promise<unknown>>();

/** Caches successful results and shares one request among identical concurrent lookups. */
async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;
  const request = load().then((value) => {
    cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
    if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
    return value;
  }).finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`external-http-${response.status}`);
  return response.json() as Promise<unknown>;
}

// Nominatim's usage policy allows at most one request per second per application. The queue is
// bounded so a burst of lookups fails fast ("busy") instead of stalling every user's request.
let nominatimQueue: Promise<unknown> = Promise.resolve();
let lastNominatimAt = 0;
let nominatimPending = 0;
function throttledNominatim(url: string): Promise<unknown> {
  if (nominatimPending >= NOMINATIM_MAX_PENDING) return Promise.reject(new ExternalServiceBusyError("geocoder-busy"));
  nominatimPending += 1;
  const run = nominatimQueue.then(async () => {
    const wait = lastNominatimAt + NOMINATIM_SPACING_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastNominatimAt = Date.now();
    return getJson(url);
  }).finally(() => { nominatimPending -= 1; });
  nominatimQueue = run.catch(() => undefined);
  return run;
}

export type WikipediaArticle = { title: string; url: string; extract: string };

/** Top Wikipedia articles for a query with their plain-text introductions. */
export async function searchWikipedia(query: string, limit = 3, lang = "en"): Promise<WikipediaArticle[]> {
  const trimmed = query.trim().slice(0, 300);
  if (!trimmed) return [];
  return cached(`wiki:${lang}:${limit}:${trimmed.toLowerCase()}`, async () => {
    const base = `https://${lang}.wikipedia.org/w/api.php`;
    let titles: string[] = [];
    for (const variant of wikipediaQueryVariants(trimmed)) {
      const searchUrl = `${base}?action=query&list=search&format=json&srlimit=${limit}&srsearch=${encodeURIComponent(variant)}`;
      titles = parseWikipediaSearch(await getJson(searchUrl));
      if (titles.length) break;
    }
    if (!titles.length) return [];
    const extractUrl = `${base}?action=query&prop=extracts&exintro=1&explaintext=1&redirects=1&format=json&titles=${encodeURIComponent(titles.join("|"))}`;
    const extracts = parseWikipediaExtracts(await getJson(extractUrl));
    const byTitle = new Map(extracts.map((entry) => [entry.title, entry.extract]));
    return titles
      .map((title) => ({ title, url: wikipediaUrl(title, lang), extract: byTitle.get(title) ?? "" }))
      .filter((article) => article.extract);
  });
}

/** Geocodes a free-text place with OpenStreetMap Nominatim. */
export async function geocodePlace(place: string, limit = 3): Promise<GeocodeResult[]> {
  const trimmed = place.trim().slice(0, 250);
  if (!trimmed) return [];
  return cached(`geo:${limit}:${trimmed.toLowerCase()}`, async () => {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=0&accept-language=en&limit=${limit}&q=${encodeURIComponent(trimmed)}`;
    return parseNominatim(await throttledNominatim(url));
  });
}

/** Notable places (Wikipedia articles with coordinates) around a point. */
export async function findNearbyPlaces(latitude: number, longitude: number, radiusMeters = 10_000, limit = 8): Promise<NearbyPlace[]> {
  const radius = Math.min(10_000, Math.max(500, Math.round(radiusMeters)));
  return cached(`near:${latitude.toFixed(3)}:${longitude.toFixed(3)}:${radius}:${limit}`, async () => {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&format=json&gscoord=${latitude}%7C${longitude}&gsradius=${radius}&gslimit=${limit}`;
    return parseWikipediaGeosearch(await getJson(url));
  });
}

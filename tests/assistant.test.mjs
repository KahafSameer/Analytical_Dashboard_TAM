import assert from "node:assert/strict";
import test from "node:test";
import { buildProjectProfile, findProjects } from "../lib/assistant/project-lookup.ts";
import { haversineKm, makePlace, parsePublicHttpUrl } from "../lib/assistant/geo.ts";
import {
  collectGroundingSources,
  parseNominatim,
  parseWikipediaExtracts,
  parseWikipediaGeosearch,
  parseWikipediaSearch,
  wikipediaQueryVariants,
} from "../lib/assistant/web-sources.ts";
import { extractUrls, resolveAnswerLink } from "../lib/assistant/links.ts";
import { RequestValidationError, validateAssistantRequest } from "../lib/assistant/request.ts";
import { parseBlocks } from "../lib/assistant/markdown.ts";
import {
  applyChatDelta,
  parseRetryAfterMs,
  parseToolArguments,
  stripCitationMarkers,
  takeSseData,
  toOpenAiTools,
} from "../lib/assistant/openai-stream.ts";

function site(overrides) {
  return {
    id: "scheme-1",
    name: "Project",
    description: "",
    district: "Lahore",
    region: "Not specified",
    category: "Unclassified",
    image: "https://example.com/a.jpg",
    approvedCost: 100,
    allocated: 50,
    released: 40,
    utilized: 20,
    overallProgress: 0.2,
    fiscalYears: [{ label: "2025-26", allocation: 50, release: 40, utilized: 20 }],
    ...overrides,
  };
}

const sites = [
  site({ id: "scheme-2701", code: "2701", name: "Chair Lift System and allied Infrastructure at Kotli Sattian", district: "Murree" }),
  site({ id: "scheme-2703", code: "2703", name: "Feasibility Study for Installation of Chairlift and Cable Car Lakot to Pindi Point Murree", district: "Murree" }),
  site({ id: "scheme-2713", code: "2713", name: "Digitalization of ITHM and Provision of Missing Facilities Lahore", district: "Lahore" }),
];

test("project lookup matches by code, partial name and Roman Urdu phrasing", () => {
  assert.equal(findProjects(sites, "2713")[0].site.id, "scheme-2713");
  assert.equal(findProjects(sites, "#2701")[0].site.id, "scheme-2701");
  assert.equal(findProjects(sites, "Kotli Sattian chair lift project")[0].site.id, "scheme-2701");
  assert.equal(findProjects(sites, "kotli sattian wala chairlift")[0].site.id, "scheme-2701");
  assert.deepEqual(findProjects(sites, "completely unrelated words"), []);
  assert.deepEqual(findProjects(sites, "   "), []);
});

test("project profile reports amounts, unspent release and omits placeholder labels", () => {
  const profile = buildProjectProfile(site({ released: 40, utilized: 55, overallProgress: 0.5512 }));
  assert.equal(profile.releasedNotYetSpent, 0);
  assert.equal(profile.financialProgressPercent, 55.1);
  assert.equal(profile.dashboardPath, "/sites/scheme-1");
  assert.equal("region" in profile, false);
  assert.equal("category" in profile, false);
  assert.equal(profile.fiscalYears[0].year, "2025-26");
});

test("haversine distance and map links", () => {
  const lahoreToMurree = haversineKm(31.5204, 74.3587, 33.9070, 73.3943);
  assert.ok(lahoreToMurree > 270 && lahoreToMurree < 285, `got ${lahoreToMurree}`);
  const place = makePlace("Murree", 33.907012345, 73.394312345);
  assert.equal(place.latitude, 33.907012);
  assert.match(place.googleMapsUrl, /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=33\.907012,73\.394312$/);
});

test("only public http(s) URLs can be read", () => {
  assert.ok(parsePublicHttpUrl("https://en.wikipedia.org/wiki/Murree"));
  for (const bad of ["file:///etc/passwd", "javascript:alert(1)", "http://localhost:3000/api", "http://192.168.1.10/", "http://127.0.0.1/", "https://user:pass@example.com/", "not a url"]) {
    assert.equal(parsePublicHttpUrl(bad), null, bad);
  }
});

test("Wikipedia and OpenStreetMap responses are parsed defensively", () => {
  assert.deepEqual(parseWikipediaSearch({ query: { search: [{ title: "Murree" }, { nope: 1 }] } }), ["Murree"]);
  assert.deepEqual(parseWikipediaSearch(null), []);
  const extracts = parseWikipediaExtracts({ query: { pages: { 1: { title: "Murree", extract: "<b>Murree</b> is a hill station." }, 2: { title: "Empty" } } } });
  assert.deepEqual(extracts, [{ title: "Murree", extract: "Murree is a hill station." }]);
  const nearby = parseWikipediaGeosearch({ query: { geosearch: [{ title: "Patriata", dist: 9812.4 }] } });
  assert.deepEqual(nearby, [{ title: "Patriata", distanceKm: 9.8, url: "https://en.wikipedia.org/wiki/Patriata" }]);
  const geocoded = parseNominatim([{ lat: "33.8058", lon: "73.5237", display_name: "Kotli Sattian Tehsil, Murree, Punjab", name: "Kotli Sattian Tehsil", category: "boundary", type: "administrative" }, { lat: "999", lon: "0", display_name: "bad" }]);
  assert.equal(geocoded.length, 1);
  assert.equal(geocoded[0].name, "Kotli Sattian Tehsil");
});

test("long web queries produce shorter Wikipedia keyword variants", () => {
  const variants = wikipediaQueryVariants("What is Kotli Sattian known for as a tourist destination, and best season to visit?");
  assert.equal(variants[0].startsWith("What is Kotli Sattian"), true);
  assert.ok(variants.includes("Kotli Sattian"), JSON.stringify(variants));
});

test("grounding sources are de-duplicated and labelled by provider", () => {
  const sources = collectGroundingSources({
    groundingChunks: [
      { web: { uri: "https://example.com/a", title: "A" } },
      { web: { uri: "https://example.com/a", title: "A again" } },
      { maps: { uri: "https://maps.google.com/?cid=1", title: "Patriata" } },
      { web: { uri: "javascript:alert(1)", title: "bad" } },
    ],
  });
  assert.deepEqual(sources.map((source) => [source.title, source.provider]), [["A", "google_search"], ["Patriata", "google_maps"]]);
});

test("answer links are clickable only for dashboard paths, trusted hosts or known sources", () => {
  const known = new Set(["https://news.example.com/story"]);
  assert.deepEqual(resolveAnswerLink("/sites/scheme-2701", known), { kind: "internal", href: "/sites/scheme-2701" });
  assert.equal(resolveAnswerLink("https://news.example.com/story", known)?.kind, "external");
  assert.equal(resolveAnswerLink("https://www.google.com/maps/search/?api=1&query=1,2", known)?.kind, "external");
  assert.equal(resolveAnswerLink("https://www.google.com/search?q=phish", known), null);
  assert.equal(resolveAnswerLink("https://evil.example.net/login", known), null);
  assert.equal(resolveAnswerLink("javascript:alert(1)", known), null);
  assert.equal(resolveAnswerLink("/admin", known), null);
});

test("request validation trims long history instead of rejecting follow-ups", () => {
  const longAnswer = "x".repeat(4_000);
  const result = validateAssistantRequest({
    message: "  and which one is in Murree?  ",
    history: [{ role: "user", content: "top projects" }, { role: "assistant", content: longAnswer }],
    context: { projectId: "scheme-2701" },
  });
  assert.equal(result.message, "and which one is in Murree?");
  assert.equal(result.history[1].content.length, 1_500);
  assert.deepEqual(result.pageContext, { projectId: "scheme-2701" });
  assert.throws(() => validateAssistantRequest({ message: "" }), RequestValidationError);
  assert.throws(() => validateAssistantRequest({ message: "x".repeat(1_501) }), RequestValidationError);
  assert.throws(() => validateAssistantRequest({ message: "hi", history: [{ role: "system", content: "x" }] }), RequestValidationError);
  assert.throws(() => validateAssistantRequest({ message: "hi", context: { projectId: 5 } }), RequestValidationError);
});

test("ranked lists keep their numbering when items have sub-bullets", () => {
  const blocks = parseBlocks("Top projects:\n1. **Chair Lift** — Rs 1,016.6m\n   - Released: Rs 1,091.5m\n   - Utilized: Rs 74.9m\n2. **Lahore Heritage** — Rs 180.0m\n\n3. **Religious Trail** — Rs 185.0m\nNote after the list.\n4. Restarted later");
  assert.equal(blocks[0].type, "paragraph");
  assert.equal(blocks[1].type, "list");
  assert.equal(blocks[1].ordered, true);
  assert.equal(blocks[1].items.length, 3);
  assert.deepEqual(blocks[1].items[0].children, ["Released: Rs 1,091.5m", "Utilized: Rs 74.9m"]);
  assert.equal(blocks[2].type, "paragraph");
  assert.equal(blocks[3].start, 4);
});

test("Markdown tables are parsed into header and rows; lone pipes stay text", () => {
  const blocks = parseBlocks("Top places:\n\n| مقام | شہر |\n|------|-----|\n| **لاہور قلعہ** | لاہور |\n| مری | مری | extra |\n| short |\nAfter table");
  assert.deepEqual(blocks.map((block) => block.type), ["paragraph", "table", "paragraph"]);
  assert.deepEqual(blocks[1].header, ["مقام", "شہر"]);
  assert.deepEqual(blocks[1].rows, [["**لاہور قلعہ**", "لاہور"], ["مری", "مری"], ["short", ""]]);
  assert.deepEqual(parseBlocks("| not a table |").map((block) => block.type), ["paragraph"]);
  assert.deepEqual(parseBlocks("a | b\n---").map((block) => block.type), ["paragraph", "rule"]);
});

test("bold text at line start is not mistaken for a bullet", () => {
  const blocks = parseBlocks("**Murree** has the highest unspent release.\n---\n### Details");
  assert.deepEqual(blocks.map((block) => block.type), ["paragraph", "rule", "heading"]);
});

test("URLs written by the user are extracted for read_webpage provenance", () => {
  assert.deepEqual(extractUrls("Summarize https://en.wikipedia.org/wiki/Patriata, please (also http://example.com/a?b=1)."), [
    "https://en.wikipedia.org/wiki/Patriata",
    "http://example.com/a?b=1",
  ]);
  assert.deepEqual(extractUrls("no links here"), []);
});

test("OpenAI-compatible SSE stream is parsed into text and assembled tool calls", () => {
  const { payloads, rest } = takeSseData('data: {"a":1}\n\ndata: [DONE]\ndata: {"part');
  assert.deepEqual(payloads, ['{"a":1}', "[DONE]"]);
  assert.equal(rest, 'data: {"part');
  const calls = new Map();
  assert.equal(applyChatDelta(calls, { content: "Hello" }), "Hello");
  applyChatDelta(calls, { tool_calls: [{ index: 0, id: "call_1", function: { name: "find_", arguments: '{"pla' } }] });
  applyChatDelta(calls, { tool_calls: [{ index: 0, function: { name: "place", arguments: 'ce":"Murree"}' } }] });
  assert.deepEqual([...calls.values()], [{ id: "call_1", name: "find_place", arguments: '{"place":"Murree"}' }]);
  assert.deepEqual(parseToolArguments('{"place":"Murree"}'), { place: "Murree" });
  assert.deepEqual(parseToolArguments("not json"), {});
  assert.deepEqual(parseToolArguments("[1,2]"), {});
});

test("browser citation markers are removed and retry headers parsed", () => {
  assert.equal(stripCitationMarkers("Safety plan launched【1†L14-L18】 on Nov 2."), "Safety plan launched on Nov 2.");
  assert.equal(parseRetryAfterMs("3.967s"), 3967);
  assert.equal(parseRetryAfterMs("2"), 2000);
  assert.equal(parseRetryAfterMs("1m30s"), 90000);
  assert.equal(parseRetryAfterMs("soon"), undefined);
  assert.equal(parseRetryAfterMs(null), undefined);
});

test("tool declarations convert to the OpenAI tools format", () => {
  const tools = toOpenAiTools([{ name: "find_place", description: "Locate", parametersJsonSchema: { type: "object", properties: { place: { type: "string" } } } }, { description: "nameless" }]);
  assert.equal(tools.length, 1);
  assert.deepEqual(tools[0].function.name, "find_place");
  assert.equal(tools[0].type, "function");
});

test("released-but-unspent is a schema field the planner can sort by directly", async () => {
  const { discoverDatasetSchema, getFieldValue } = await import("../lib/data-schema.ts");
  const schema = discoverDatasetSchema([site({ released: 40, utilized: 55 })], ["Name", "Released", "Funds Utilized"]);
  const field = schema.fields.find((entry) => entry.id === "releasedNotSpent");
  assert.ok(field, "field should be present when released and utilized columns exist");
  assert.equal(getFieldValue(site({ released: 90, utilized: 20 }), field), 70);
  assert.equal(getFieldValue(site({ released: 40, utilized: 55 }), field), 0);
  const withoutReleased = discoverDatasetSchema([site({})], ["Name", "Funds Utilized"]);
  assert.equal(withoutReleased.fields.some((entry) => entry.id === "releasedNotSpent"), false);
});

test("reply language is detected from the user's latest message", async () => {
  const { detectReplyLanguage } = await import("../lib/assistant/language.ts");
  assert.equal(detectReplyLanguage("Kotli Sattian chair lift project kahan hai aur iski financial progress kitni hai?"), "roman-urdu");
  assert.equal(detectReplyLanguage("Lahore se Murree kitna door hai?"), "roman-urdu");
  assert.equal(detectReplyLanguage("یہ منصوبہ کہاں واقع ہے؟"), "urdu-script");
  assert.equal(detectReplyLanguage("Which district has the most unspent funds?"), "english");
  assert.equal(detectReplyLanguage("Summarize https://en.wikipedia.org/wiki/Patriata in 3 bullet points."), "english");
  assert.equal(detectReplyLanguage("Top 5 projects in Lahore"), "english");
  assert.equal(detectReplyLanguage("12345"), "english");
});

test("Gemini rate-limit hints are read from the SDK's escaped nested error JSON", async () => {
  const { parseGeminiRetryDelayMs, parseGeminiQuotaMetric, isDailyQuotaMessage } = await import("../lib/assistant/rate-limits.ts");
  // Shape of a real streaming 429: the API's JSON is nested as an escaped string.
  const escaped = String.raw`{"error":{"message":"{\n  \"error\": {\n    \"code\": 429,\n    \"message\": \"Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20. Please retry in 11h46m16.19s.\",\n    \"details\": [{\"violations\": [{\"quotaMetric\": \"generativelanguage.googleapis.com/generate_content_free_tier_requests\", \"quotaId\": \"GenerateRequestsPerDayPerProjectPerModel-FreeTier\"}]}, {\"retryDelay\": \"42376s\"}]}}","code":429}}`;
  assert.equal(parseGeminiRetryDelayMs(escaped), 42_376_000);
  assert.equal(parseGeminiQuotaMetric(escaped), "generate_content_free_tier_requests");
  assert.equal(isDailyQuotaMessage(escaped), true);
  // Plain JSON and prose-only variants.
  assert.equal(parseGeminiRetryDelayMs(`{"retryDelay": "7s"}`), 7_000);
  assert.equal(parseGeminiRetryDelayMs("Please retry in 2m3.5s."), 123_500);
  assert.equal(parseGeminiRetryDelayMs("model overloaded"), undefined);
  assert.equal(isDailyQuotaMessage("GenerateRequestsPerMinutePerProjectPerModel-FreeTier"), false);
});

test("Groq limit kinds and durations are parsed", async () => {
  const { parseGroqLimitKind, parseDurationMs, isDailyQuotaMessage } = await import("../lib/assistant/rate-limits.ts");
  const tpm = "Rate limit reached for model `openai/gpt-oss-120b` on tokens per minute (TPM): Limit 8000, Used 7000. Please try again in 7.5s.";
  assert.equal(parseGroqLimitKind(tpm), "TPM");
  assert.equal(isDailyQuotaMessage(tpm), false);
  assert.equal(isDailyQuotaMessage("on requests per day (RPD): Limit 1000"), true);
  assert.equal(parseDurationMs("802ms"), 802);
  assert.equal(parseDurationMs("2m52.8s"), 172_800);
  assert.equal(parseDurationMs("1h2m3s"), 3_723_000);
  assert.equal(parseDurationMs("7.5"), 7_500);
  assert.equal(parseDurationMs("later"), undefined);
});

test("a spent daily quota is skipped for up to an hour; short limits only briefly", async () => {
  const { CooldownTracker, cooldownForFailure, MAX_COOLDOWN_MS } = await import("../lib/assistant/rate-limits.ts");
  assert.equal(cooldownForFailure(429, 42_376_000, true), MAX_COOLDOWN_MS);
  assert.equal(cooldownForFailure(429, undefined, true), MAX_COOLDOWN_MS);
  assert.equal(cooldownForFailure(429, 7_500), 7_500);
  assert.equal(cooldownForFailure(429, 500), 5_000);
  assert.equal(cooldownForFailure(429, undefined), 30_000);
  assert.equal(cooldownForFailure(503), 20_000);
  assert.equal(cooldownForFailure(400), 0);

  let now = 0;
  const tracker = new CooldownTracker(() => now);
  tracker.note("flash", cooldownForFailure(429, 42_376_000, true)); // daily cap
  tracker.note("lite", cooldownForFailure(503)); // overloaded
  assert.deepEqual(tracker.order(["flash", "lite", "other"]), ["other", "lite"]);
  assert.equal(tracker.isExhausted("flash"), true);
  assert.equal(tracker.isExhausted("lite"), false);
  now = 25_000;
  assert.deepEqual(tracker.order(["flash", "lite"]), ["lite"]);
  now = MAX_COOLDOWN_MS + 1;
  assert.deepEqual(tracker.order(["flash", "lite"]), ["flash", "lite"]);
});

# AI Assistant

The floating **AI Assistant** answers questions about the connected Google Sheet, about places and topics related to the projects, and general or current questions from the web, in English, Urdu (Arabic script), Roman Urdu/Hindi or mixed language. Every answer shows where it came from: **your sheet**, **the web** or **the map**.

## How it works

```text
Widget ──POST /api/assistant──▶ route.ts (validate, rate-limit, stream NDJSON)
                                   │
                                   ▼
                     lib/assistant/agent.ts — Gemini function-calling loop
                     (≤ 6 model turns, ≤ 8 tool calls, ~52 s budget)
                                   │ calls tools, possibly in parallel
        ┌──────────────────┬───────┴─────────┬──────────────────┬─────────────────┐
        ▼                  ▼                 ▼                  ▼                 ▼
 query_dashboard_data  get_project_details  web_search        find_place        read_webpage
 planner → validated   fuzzy name/code/ID   Google Search     OpenStreetMap     Gemini URL
 TypeScript query      lookup, full profile grounding → Groq geocode + nearby  context
 (lib/dataset-query)   (project-lookup.ts)  live search →     places; Google
                                            Wikipedia
                                                              Maps grounding
                                                              when available
```

1. The model reads the question (plus recent history, today's date, a one-line description of the dataset, and, on a project page, which project is open) and decides which tools to call.
2. Tools run on the server. **All sheet numbers are computed in TypeScript**; the model never does arithmetic on raw rows.
3. The route streams progress to the widget as NDJSON: `status` (tool started/finished), `delta` (answer text as it is written), `reset` (discard partial text), then `answer` (final text + sources) or `error`.

## Tools

| Tool | Answers | Provider |
|---|---|---|
| `query_dashboard_data` | Rankings, totals, averages, filters, comparisons, district groupings, fiscal years | Existing planner (`lib/gemini.ts`) + `lib/dataset-query.ts` |
| `get_project_details` | One project's full profile; resolves "which project" | Local fuzzy match (`lib/assistant/project-lookup.ts`) |
| `web_search` | Background, attractions, seasons, news, policies, definitions | Google Search grounding → **live search via Groq** (`browser_search`) → Wikipedia |
| `find_place` | Where something is, map links, what's nearby, straight-line distance + directions link | OpenStreetMap Nominatim + Wikipedia geosearch; Google Maps grounding when available |
| `read_webpage` | A specific public URL | Gemini URL context |

### Web search providers

1. **Google Search grounding** (Gemini) — needs a Gemini plan with grounding quota. A quota rejection is remembered for 15 minutes; an ordinary rate limit only for the delay the API asks for.
2. **Live web search via Groq** — `openai/gpt-oss-20b` (then `openai/gpt-oss-120b` if it is rate limited) with Groq's built-in `browser_search` tool returns a dated briefing with source URLs (e.g. current news). Used when `GROQ_API_KEY` is set. Search runs on a different model than the backup agent because one search uses ~5k tokens, most of a model's 8k tokens-per-minute free quota.
3. **Wikipedia** — keyless last resort; the answer says recent news may be missing.

Places use OpenStreetMap Nominatim plus Wikipedia geosearch, and Google Maps grounding when the Gemini plan allows it. To enable Google Search/Maps grounding, enable billing for the Gemini key in Google AI Studio (no code change). `ASSISTANT_GOOGLE_GROUNDING=off` skips the attempt.

### Backup model (Groq)

If every Gemini attempt for a question fails (rate limit, overload, model unavailable, key problem), the same tool-using agent runs on Groq (`openai/gpt-oss-120b`, OpenAI-compatible function calling) with the same tools, budgets and safety rules. Each backup turn fails over to `qwen/qwen3.8-27b` (a separate per-model Groq quota) and continues the same conversation; if every backup model is only briefly rate limited, it waits once (≤12 s) for the soonest to recover. If Gemini fails later in a question, the answer is written from the tool results already gathered. Sheet-query planning also falls back to Groq (JSON mode) when Gemini cannot plan; the plan is validated against the schema as usual. Groq's free tier allows about 8k tokens/minute per model, so backup prompts are kept compact. NVIDIA-hosted models can be added as a further backup by setting both `NVIDIA_API_KEY` and `NVIDIA_MODEL` (off by default because model availability varies by NVIDIA account).

### Data-source confidentiality

Visitors are not told where the dashboard data is stored. The assistant refers to it only as "the dashboard data" / "the project records" (Urdu: "ڈیش بورڈ کا ڈیٹا", Roman Urdu: "dashboard ka data") and never names Google Sheets, spreadsheets, files, APIs, tools or AI providers; asked directly, it says the data is the department's official project records. In the widget the sheet step reads "Analyzing project data" and its sources are grouped as "Dashboard data". Configuration errors (missing key, rejected model access) show a neutral message; the cause is written to the server log only.

### Language

The reply language is detected from the user's latest message (Urdu script, Roman Urdu, or English) and passed to every model as an explicit instruction, so backup providers follow it too.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | — (required) | Server-only Gemini key |
| `GEMINI_MODEL` | `gemini-3.5-flash` | Orchestrating model (tool use + final answer) |
| `GEMINI_FALLBACK_MODEL` | `gemini-3.5-flash-lite` | Used when the primary model is rate limited or unavailable |
| `GEMINI_PLANNER_MODEL` | `gemini-3.5-flash-lite` | Sheet-query planner and grounded sub-requests |
| `ASSISTANT_GOOGLE_GROUNDING` | on | `off` disables Google Search/Maps grounding attempts |
| `GROQ_API_KEY` | — (optional) | Enables live web search and the backup agent |
| `GROQ_MODEL` | `openai/gpt-oss-120b` | Groq backup-agent model |
| `GROQ_FALLBACK_MODEL` | `qwen/qwen3.8-27b` | Second backup model (own quota); `off` disables |
| `GROQ_SEARCH_MODEL` | `openai/gpt-oss-20b` | Live web-search model (must support `browser_search`) |
| `NVIDIA_API_KEY` + `NVIDIA_MODEL` | — (optional, both required) | Extra OpenAI-compatible backup provider |
| `ASSISTANT_CONTACT` | — (optional) | Contact URL/email appended to the User-Agent sent to OpenStreetMap/Wikipedia |

## Reliability

- Free-tier Gemini keys are frequently rate limited (429), capped per day (e.g. `gemini-3.5-flash`: 20 requests/day per Google Cloud project) or overloaded (503). Model health is tracked per model and shared by the agent and the planner (`lib/assistant/rate-limits.ts`):
  - a **daily cap** (detected from the quota ID / retry delay, including the SDK's escaped error JSON) skips that model for the quota window, up to an hour, instead of retrying it on every question;
  - per-minute limits and overloads cause a short cooldown (5 s–2 min, honoring the API's suggested delay);
  - with a Groq key configured, a briefly cooling or failing Gemini model is not retried — the backup answers sooner; without one, Gemini is retried once after the suggested delay.
- SDK timeouts and dropped connections count as transient. When Gemini cannot finish, the answer is written from results already gathered, or the Groq backup agent answers. If nothing can answer, the user sees a "busy" message in their own language (English, Urdu script or Roman Urdu).
- A new Gemini key only helps if it belongs to a different Google Cloud project (quotas are per project), or after enabling billing.
- Every model turn and tool call is bounded by the time left in a ~52 s budget, and the final answer always has time reserved. Per question: at most 6 model turns, 8 tool calls, and 3 sheet queries / 3 web searches / 3 place lookups / 2 page reads / 4 project lookups.
- Wikipedia/Nominatim requests are cached for 6 hours (identical concurrent lookups share one request), time out after 8 s, and Nominatim is throttled to 1 request/second per instance with at most 6 queued lookups (extra lookups fail fast instead of stalling).
- The route allows 60 s (`maxDuration`) and at most 8 concurrent assistant runs per instance; the widget aborts after 80 s and offers a Stop button.

## Safety

- All tools are read-only. Web pages, Wikipedia text, sheet text and chat history are treated as untrusted data; the model is instructed to ignore instructions inside them.
- Answer Markdown is rendered as React elements (never HTML). Links are clickable only for dashboard paths (`/sites/…`), Google Maps / OpenStreetMap / Wikipedia, or URLs returned by tools for that answer; any other URL renders as plain text.
- `read_webpage` only opens URLs the user wrote (in this message or earlier user messages) or that tools returned during the same question. A URL suggested by web content (prompt injection) is refused, so it cannot be used to send conversation data to a third party or appear as a cited link. URLs must be public `http(s)` (no credentials, localhost or private ranges); the page is fetched by Google, not by this server.
- Server logs record only the error status/quota name, never questions, answers or keys.
- The per-IP limit (12 requests/minute) is process-local; one question can cause several Gemini calls. For public deployments add a shared rate limit and Gemini budget alerts.

## Known limits

- Without Google grounding quota and without a Groq key, "latest news" questions cannot be answered from live sources; the assistant says so.
- Groq's free tier (~8k tokens/minute and 1,000 requests/day per model) limits how many live searches and backup answers fit in a minute; search and the backup agent use different models to spread the load, and when search is exhausted it falls back to Wikipedia.
- Distances are straight-line; the directions link gives real routes and travel time.
- The sheet contains financial data only: no visitor numbers, milestones or physical progress. The assistant says so instead of estimating.

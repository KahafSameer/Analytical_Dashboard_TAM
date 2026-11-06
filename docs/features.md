# Features

## Portfolio overview (`/`)

- Summary metrics for project count, cost-weighted financial progress, expenditure, and projects with recorded spend.
- One filter bar (search, district, spend status, financial-progress range) drives every figure. Filters are kept in the URL (`?q=&district=&spend=&progress=`), so a filtered view can be bookmarked or shared.
- **Funding flow:** allocated / released / utilized by fiscal year (grouped bars) and a funding pipeline (approved → allocated → released → utilized, with the conversion between stages).
- **Portfolio analytics:** insight cards; funding by district (select a bar to filter the page, with an Undo toast); where the approved cost sits (largest projects' share); district × fiscal-year heatmap (allocated / released / utilized; select a district to filter); released-but-unspent watchlist; financial-progress distribution; source-category mix when the sheet has categories.
- **Schedule & delivery** (from the gestation period column): projects past their planned end, ending within six months and not yet started; started projects whose spending trails elapsed time the most; planned completions by half-year or year; project size vs financial progress scatter (log scale, colored by schedule status; select a dot to open the project). Time elapsed vs spend is a prompt to check, not proof of delay.
- **Project register** (shown right after the summary): each row has the project name, district and code, a year-wise funding mini chart (allocated / released / utilized), approved, utilized and unspent amounts, and a financial-progress ring. **View progress** opens an in-row panel with the money flow (approved → allocated → released → utilized and unspent release), fiscal-year bars with values, and the schedule (time elapsed vs money spent and this year's progress), plus Share and Open full project. Sortable and paginated; below 1180 px rows become cards; an optional card view remains.
- **Share & print:** Share the current view (device share sheet, WhatsApp, Facebook, X, LinkedIn, Telegram, email, copy link or summary) and Print / Save as PDF with a print layout.

## Plain-language help (easy-view)

The dashboard is written for readers with no finance background:

- **How to read guide** (`/guide`, "How to read" in the sidebar): what the dashboard shows and does not show, the money journey (approved → set aside → handed over → spent) with an example, what every color means, reading amounts (millions ↔ lakh/crore table), budget years, a glossary of key words, how to use filters/register/charts/share/assistant, and limits to keep in mind.
- **ⓘ buttons** next to every chart title, headline number and the project-list columns open a short "how to read this" explanation with a link to the guide. They work by tap on phones and close with Escape.
- **"In short"** boxes on the overview and every project page turn the current figures into plain sentences (with crore equivalents and schedule notes).
- **Interactive guided tour** (like product tours on professional sites): the page dims, one element at a time is spotlighted and a box explains what it is and what its buttons do, with Back / Next / Skip, "Step 3 of 12" and progress dots. It scrolls to each stop on its own (waiting for charts that load later), works with the keyboard (→ next, ← back, Esc closes; focus stays in the box) and on phones (the explanation is a bottom sheet that moves to the top when the highlighted item is at the bottom). Overview tour: 12 stops (filters, "In short", key numbers, a project row, View progress, money pipeline, charts, schedule, share/print, AI Assistant, guide). Project page tour: 8 stops. Start it from "Take the 1-minute tour" on the welcome card, "Take the tour" / "Tour this page" next to Share, or "Take the interactive tour" on the guide (a `/?tour=1` link).
- **Welcome card** for first-time visitors (remembered after "Got it", after opening the guide, or after the tour).
- Labels use everyday words where possible ("Spent", "Not spent", "Money by budget year"); official terms stay in the glossary and CSV exports.
- All help text lives in `lib/guide-content.ts`; summaries in `lib/plain-summary.ts`.

## Project detail (`/sites/[siteId]`)

- Project details, source code, district, gestation range, category, status and overall financial progress.
- Project financial KPIs.
- Allocation/release/utilization by fiscal year, shown as a grouped bar chart and a breakdown table.
- Additional charts: allocation utilization donut, cumulative fiscal-year funding and annual release/utilization rates.
- Schedule vs spend: planned period timeline with today's position, time elapsed vs financial progress, days to (or since) the planned end.
- How it compares: financial progress, released funds spent, allocation released and current-year progress against the district and the portfolio (amount-weighted).
- Related projects in the same district, with a link to the filtered district view.
- Share project (with a generated link-preview image) and Print / Save as PDF.
- CSV summary export.
- An explicit explanation that activity milestones and physical progress are absent from this source.

## Master Google Sheet

One Google Spreadsheet is the sole source of all portfolio records. The server reads its first worksheet through `lib/google-sheets.ts` and normalizes it with `lib/excel.ts`. Projects and detail analytics are generated from the normalized records. The browser refreshes shared dashboard state every 30 seconds while visible; no browser upload or local-storage project repository is present.

## Export

- Project export downloads the project's source financial fields and fiscal-year breakdown as CSV.
- Portfolio export downloads the records loaded from Google Sheets as CSV.
- Neither export is an Excel `.xlsx` file, PDF report, signed report or official statement.

## Navigation and loading

The sidebar and mobile drawer share the workspace navigation. `app/loading.tsx` provides skeleton UI. Unknown project IDs and unavailable/invalid sheet data display friendly states.

## Empty states

Search/filter no-results and missing annual funding have designed empty states. Several chart-level no-data branches are also present. Further QA should check all-zero and partial-schema workbooks.

## Dashboard assistant

See [assistant.md](assistant.md) for the full design. In short:

- The assistant is a Gemini tool-using agent: it answers sheet questions (computed in TypeScript), project lookups, locations/maps/nearby places/distances, web and general-knowledge questions, and specific URLs, combining tools for mixed questions.
- Web answers use Google Search grounding when the Gemini plan allows it, otherwise live web search via Groq, otherwise Wikipedia; locations use OpenStreetMap (plus Google Maps grounding when available). Answers cite sheet, web and map sources separately. If Gemini is unavailable, the same agent runs on Groq.
- Progress steps and answer text stream live; the widget has Stop, Copy, Share (WhatsApp, Telegram, email, copy) and New chat, recognizes the project page being viewed ("this project"), and renders Urdu right-to-left.

The sheet-query layer behind the `query_dashboard_data` tool:

- A floating AI Assistant opens a compact desktop chat panel or mobile bottom sheet, with suggested questions and a bounded conversation history.
- The server-only `POST /api/assistant` route reads the same normalized Google Sheets dataset used by dashboard pages.
- Gemini creates a generic JSON query plan using the runtime schema discovered from normalized fields and source-provided extra columns. TypeScript validates field IDs/operators and performs all filtering, sorting, grouping, calculations, and aggregation.
- Generic operations include multi-condition filters, sorting/ranking, group-by, count/sum/average/min/max/median, safe numeric differences/ratios, hypothetical top/bottom exclusions, and dataset-wide numeric/categorical/date profiling.
- Follow-up turns receive bounded recent conversation history to resolve references; the query still executes against current source data.
- Broad questions such as “what’s unusual?”, “what needs attention?”, or “summarize the sheet” use deterministic field-wide profiles and outlier signals. Outliers are statistical indicators, not proof of data errors or causes.
- Additional columns such as contractor, status, city, dates or other source values are available when present in the sheet. Absent fields are identified as unavailable instead of being inferred.
- Gemini receives schema metadata for planning, then only the validated query summary and relevant deterministic results for answer wording; the complete raw dataset is not sent to Gemini.
- English, Urdu, Hindi, Roman Urdu, Roman Hindi, and mixed-language requests are handled by Gemini's multilingual language understanding and answer generation. Language quality can vary, and no universal accuracy guarantee is implied.
- Suggested questions are examples only and do not limit query capabilities.
- Project status, delays, milestones, activities, physical progress, historical changes, or planned-versus-actual data remain unavailable unless those fields are actually supplied by the connected sheet.
- Questions outside dashboard data are answered with the web, map or general-knowledge tools and labelled as such; missing sites and unavailable source/API states receive concise non-technical responses. The assistant does not render HTML.
- Gemini runs on the server only with `GEMINI_API_KEY` (models configurable, see assistant.md). A 1,500-character question limit, bounded eight-message history (long entries trimmed), 24 KB request cap and process-local request limit protect the endpoint.
- Answers follow the user's language and writing script; both query planning and answer generation happen server-side.

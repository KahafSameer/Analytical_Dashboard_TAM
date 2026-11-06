# Changelog

This is a user-oriented summary of the work represented in the current repository. It is not a release/tag history; inspect Git history for commit-level provenance.

## easy-view branch — plain-language version

A version of the dashboard for readers without a finance background (branch `easy-view`):

- New "How to read this dashboard" guide (`/guide`, sidebar "How to read"): the money journey, what each color means, reading amounts (millions ↔ lakh/crore), budget years, key words, how to use the dashboard and its limits.
- ⓘ buttons on every chart, headline number and the project-list columns with a short plain explanation and a link to the guide.
- "In short" summaries on the overview and project pages, generated from the live figures (with crore equivalents and schedule notes).
- Welcome card for first-time visitors.
- Interactive guided tour: spotlight + explanation box with Back / Next / Skip and progress, 12 stops on the overview and 8 on project pages; keyboard and phone friendly. Start it from the welcome card, the "Take the tour" button or the guide.
- Everyday wording: "Spent", "Not spent", "Money by budget year", "Where the money is", "Time passed vs money spent", etc.; data-source wording reads "official project records".
- The AI assistant explains money terms in plain words and has an "Explain this dashboard in simple words" suggestion.

## Unreleased — sharing, schedule analytics and new visuals

- Share any view, project or assistant answer: device share sheet, WhatsApp, Facebook, X, LinkedIn, Telegram, email, copy link or summary. Shared links show a generated preview card (Open Graph image) once the site is deployed publicly.
- Filters are stored in the URL, so a shared or bookmarked link opens the same selection.
- New Schedule & delivery section from the sheet's gestation periods: past planned end, ending soon, not started, spending behind the calendar, planned completions and a project size vs financial progress scatter.
- New visuals: funding pipeline, district × fiscal-year heatmap, approved-cost concentration; fiscal-year funding is now grouped bars (the smoothed curve implied trends between three points).
- Selecting a district in the district chart or heatmap filters the whole page, with an Undo toast.
- Project page: schedule vs spend card, comparison with district and portfolio, related projects, Share and Print/PDF; cumulative funding uses straight segments.
- Print / Save as PDF layout hides navigation and controls.
- Chart colors use a validated palette (allocated gold, released blue, utilized green) that stays distinguishable for colorblind readers; tooltips now name each series.
- Navigation adds a Schedule link.
- Assistant no longer reveals where the data is stored: progress steps read "Analyzing project data", sources are labelled "Dashboard data", the welcome text and footnote no longer mention Google Sheets, and the assistant is instructed to call it "the dashboard data" (never naming sheets, files, APIs or AI providers). Configuration errors show a neutral "temporarily unavailable" message in the user's language; details stay in the server log.
- Mobile pass (checked at 320, 360, 390, 768 and 1024 px): no horizontal overflow on any page; 8 projects per page on phones and no redundant Table/Cards switch; the district heatmap fits a phone (compact figures, short year headers); long names and values wrap instead of being cut off; dropdowns and heatmap districts have full-size tap targets; distribution axis labels no longer collide.
- Entrance motion for every hand-built visual (Recharts charts already animated): funding-pipeline, watchlist, concentration and comparison bars grow in, heatmap cells fade in as a wave, register mini charts rise and progress rings fill, the project schedule timeline draws with its Today marker, and the View progress panel's bars grow when opened. Each animates once when it scrolls into view (`useReveal` / ChartCard `data-reveal`), bar widths ease on filter changes, and reduced-motion users and print get the final state immediately.
- Fixed a hydration mismatch for reduced-motion users on the AI Assistant launcher (a conditional tap gesture changed its tabindex).
- Project register fits laptop screens without sideways scrolling: fixed column widths from 1181 px up (project names wrap), a tighter layout with a "Details" button between 1181 and 1400 px, and cards below 1181 px. Checked at 1181–1920 px, including with a progress panel open.
- Project register moved directly after the overview summary (before the analytics) and redesigned: year-wise funding mini chart and progress ring per project, and a View progress button that opens money flow, fiscal-year and schedule details in place, with Share and Open full project. Rows become cards on tablets and phones.

## Unreleased — assistant quota resilience

- Fixed: questions failed with "The assistant is busy right now" once `gemini-3.5-flash` hit its free-tier daily cap (20 requests/day). The daily cap was not recognized in the SDK's escaped error JSON, so the exhausted model was retried on every question. It is now skipped for the quota window and the assistant answers with `gemini-3.5-flash-lite` or Groq.
- Live web search and the Groq backup agent no longer share one model's tokens-per-minute quota (search uses `openai/gpt-oss-20b`); the backup agent fails over to `qwen/qwen3.8-27b` and waits briefly for a short Groq rate-limit window instead of giving up.
- With a Groq key, an overloaded Gemini model is not retried; the backup answers sooner (the reported Urdu question went from failing to ~12 s).
- Sheet questions keep working when Gemini cannot plan: the query plan falls back to Groq JSON mode and is validated as before.
- Error messages follow the user's language (Urdu script / Roman Urdu / English).
- Assistant answers render Markdown tables (scrollable, right-to-left for Urdu) and `<br>` line breaks.

## Unreleased — AI assistant as a tool-using agent

- The assistant now answers any question: sheet analytics (still computed in TypeScript), single-project profiles, locations with map links / nearby places / straight-line distance, web and general-knowledge questions, and specific URLs — combining tools for mixed questions.
- Web search uses Google Search grounding when the Gemini plan allows it and otherwise falls back to Wikipedia; places use OpenStreetMap (plus Google Maps grounding when available). Sources are shown separately as sheet / web / map.
- Answers stream live with visible tool steps; the widget adds Stop, Copy, New chat, page-aware suggestions, a "Viewing: project" chip and right-to-left rendering for Urdu.
- Resilience for free-tier limits: model fallback, retry using the API's suggested delay, and synthesis from already-gathered results instead of failing.
- Fixed: follow-up questions failed with "Please send a valid question" after any answer longer than 500 characters (history entries are now trimmed, not rejected).
- Links in answers are clickable only for dashboard paths, map/Wikipedia hosts or tool-returned URLs.
- Live web search via Groq (`browser_search`) when Google grounding is unavailable; Groq also runs the agent as a backup when Gemini is unavailable. NVIDIA is supported as an opt-in extra backup.
- New derived sheet field "Released but unspent funds" so rankings of idle money are computed directly; reply language (Urdu script / Roman Urdu / English) is detected and enforced for every model.
- Review hardening: SDK timeouts are retryable; all model turns and tools respect the time budget; empty final turns use gathered results; every function call gets a response; `read_webpage` only opens user-written or tool-returned URLs; per-tool budgets and a concurrency cap limit cost; the OpenStreetMap queue is bounded; ranked lists keep their numbering; stop/double-click, focus, scroll and screen-reader fixes in the widget.

## Unreleased — analytical dashboard overhaul

- Overview reorganized as filters → KPIs → funding flow → analytics → project register → export, so analysis is no longer below 89 project cards.
- One global filter bar (search, district, spend status, financial progress) now drives every KPI, chart, signal, the register and the CSV export, with a visible "Showing X of Y" status and a one-click reset.
- Added a sortable, paginated project register table (approved, released, utilized, unspent release, progress) as the default view; cards remain available and drop the duplicated fallback photo.
- Added a "Released, not yet spent" watchlist and an "Approved, not yet allocated" signal; the empty project-type chart is hidden when the source has no type labels.
- Raised the type scale (minimum text size 10px, body/secondary text 11–13px) and stopped chart axes from skipping category labels.
- Fixed invalid HTML (a button nested in the brand link), removed a non-functional sidebar chevron, hid "Not specified" placeholders in locations, and fixed a hydration mismatch for reduced-motion users.
- CSV export adds an unspent-release column and names filtered exports separately.

## Unreleased — Google Sheets source and live refresh

- Replaced runtime local Excel file access with a server-only Google Sheets API adapter using a read-only service account.
- Reused the existing row normalizer so the `Site`/`FiscalYear` model and analytics remain independent of source format.
- Added `/api/dashboard-data`, a 20-second per-instance cache and a single client refresh every 30 seconds while the tab is visible.
- Added a subtle freshness/stale-data indicator and previous-data retention when a background refresh fails.
- Added blank-only `.env.example`, service-account JSON ignore rules and setup/Vercel documentation.

## Earlier — master workbook normalization architecture

- Replaced the duplicate JSON/browser-import data architecture with a single root-level master workbook.
- Added server-side workbook repository with process-level cache and reusable parser/normalizer.
- Dynamically derive portfolio cards and project detail analytics from normalized workbook data, with typed error/empty states.
- Discover fiscal-year columns and group repeated project identifiers; removed local-storage import persistence.
- Removed the misleading “Recently updated” sort because the source has no row update timestamp.
- Updated documentation to describe the actual single-workbook implementation.

## Unreleased — motion design system

- Added Motion for React for viewport-based reveals, staggered/layout-aware project filtering, subtle route/navigation transitions and profile/filter feedback.
- Animated KPI count-ups and progress fills; financial charts now mount and animate once when entering view.
- Added mobile press feedback, hover-only card effects for fine pointers, and reduced-motion behavior.
- Updated responsive and design-system documentation.

## Earlier prototype work — analytics and UX

- Added project-wide and project-detail financial analytics, including district funding, category mix, progress distribution, allocation utilization, cumulative annual funding and execution rates.
- Added portfolio CSV export and workbook-provided project categories where available.
- Added responsive visual refinements, loading and empty states, reduced-motion handling and subtle entrance/hover animations.
- Added project/portfolio CSV exports.
- Added lint, typecheck and production build scripts/configuration.
- Added a comprehensive `/docs` documentation set.

## Data and scope notes

- Google Sheets is read-only. Authentication applies to the server's service account, not dashboard users.
- Database persistence, physical progress, activities, milestones, visitor analytics and dated monthly progress are not implemented.

## Maintaining this file

Add a dated or versioned entry for user-visible changes, source schema changes, new integrations and breaking behavior. Do not record a planned feature as shipped.

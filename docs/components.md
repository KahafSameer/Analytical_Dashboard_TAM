# Components

## Application shell

- `components/dashboard-shell.tsx`: responsive fixed sidebar, navigation links, mobile header/drawer, profile popover and freshness-aware `PageTopline`. Gets live project counts from the dashboard data provider.
- `components/dashboard-data-provider.tsx`: one client-held normalized dataset, 30-second background polling, request deduplication, freshness/error state and stale-data retention.
- `components/assistant/assistant-widget.tsx`: floating assistant launcher and chat panel. Reads the NDJSON stream (live tool steps, streamed text), shows sheet/web/map sources, Copy/Stop/New chat, page-aware suggestions and a "Viewing: project" chip; accessible keyboard interaction.
- `components/assistant/assistant-markdown.tsx`: safe Markdown → React renderer (headings, lists, bold/italic, code, links via `lib/assistant/links.ts`), `dir="auto"` for Urdu.
- `components/ui.tsx`: shared `StatusBadge`, `ProgressBar`, `SectionHeading`, `EmptyState`, `KpiCard`, `ChartCard` and a milestone-data note. `MilestonePlaceholder` is a data-absence notice, not an implemented milestone timeline.
- `components/info-tip.tsx`: ⓘ button with a portalled, viewport-clamped explanation popover (tap/click, Escape, outside tap); used by `ChartCard` (`help` prop), `KpiCard` (`help`/`helpAnchor`) and the register toolbar.
- `components/in-short.tsx`, `components/welcome-card.tsx`: plain-language summary box and first-visit orientation card (dismissal stored in `localStorage`, client-only so it never flashes).
- `app/guide/page.tsx`: the "How to read this dashboard" guide. Content comes from `lib/guide-content.ts` (glossary, color guide, chart and KPI help); `components/guide-visit.tsx` loads sidebar counts on this page and marks the welcome card as seen (state in `lib/welcome-state.ts`).
- `lib/plain-summary.ts`: `portfolioInShort`, `projectInShort` and `croreLabel` (covered by `tests/plain-language.test.mjs`).
- `components/product-tour.tsx` + `lib/tour.ts`: the guided tour. Steps (`OVERVIEW_TOUR`, `PROJECT_TOUR`) target `[data-tour="…"]` attributes (`ChartCard` takes a `tourId` prop); `scrollHint` scrolls lazily loaded sections into view first, missing targets are skipped. Placement (`placeTooltip`, `spotlightRect`, `targetScrollTop`) is pure and covered by `tests/tour.test.mjs`, which also fails if a step's target attribute disappears from the components. Restart a tour by changing its `key`.
- `components/motion.tsx`: reusable viewport reveal and chart entrance hooks used to keep animation logic small and localized. `useReveal` + `revealIndex` drive entrance motion for hand-built visuals (bars, heatmap cells, mini charts, rings); `ChartCard` sets `data-reveal` automatically, and the matching CSS lives in the "Entrance motion" block of `app/globals.css`. Keep motion gestures unconditional (MotionConfig handles reduced motion) so server and client markup match.

## Portfolio

- `components/sites-overview.tsx`: overview composition and portfolio KPIs; obtains the summary and fiscal-year rollup from the analytics helpers.
- `components/portfolio-filter-bar.tsx`: global search (Ctrl K), district, spend-status and financial-progress filters. The filter state lives in `sites-overview.tsx` and drives every KPI, chart, the register and the CSV export on the overview page. `?q=` pre-fills the search.
- `components/project-register.tsx`: sortable, paginated project table (default) with an optional card view, placed directly after the overview KPIs. Rows show a funding mini chart and progress ring; **View progress** expands `components/project-progress-panel.tsx` (money flow, fiscal-year bars, schedule, Share / Open full project). Below 1180 px each row is laid out as a card. Card imagery is hidden when every project shares the same fallback photo.
- `components/funding-sparkbars.tsx`: inline-SVG `FundingSparkbars` (allocated / released / utilized per fiscal year), `SparkLegend` and `ProgressRing`, light enough for every register row and card.
- `lib/portfolio-filters.ts`: pure filter/sort helpers (`filterSites`, `sortSites`, `getUnspentRelease`, `formatLocation`), covered by `tests/portfolio-filters.test.mjs`.
- `components/site-card.tsx`: image-led project card and navigation.
- `components/portfolio-chart.tsx`: responsive portfolio allocation/utilization chart.
- `components/portfolio-analytics.tsx`: district funding, category mix, progress distribution and derived financial signals.
- `components/lazy-portfolio-charts.tsx` and `components/lazy-site-charts.tsx`: defer below-the-fold chart modules until they approach the viewport; chart data remains available in semantic tables.
- `components/use-near-viewport.ts`: shared viewport-observation hook for deferred chart loading.
- `components/portfolio-export-button.tsx`: downloads the currently loaded Google Sheets portfolio rows as CSV.
- `components/funding-pipeline.tsx`: approved → allocated → released → utilized with stage conversion (plain HTML, no chart library).
- `components/schedule-insights.tsx` (lazy, via `LazyScheduleInsights`): schedule signals, spending-behind-the-calendar list, planned completions and the size vs progress scatter. Uses the data's `fetchedAt` as "today" so server and browser render identically.
- `components/share-menu.tsx`: `ShareMenu` (device share sheet, platform links, copy link/summary; portalled to `<body>` with fixed positioning so scroll containers cannot clip it; keyboard accessible) and `PrintButton`.
- `lib/share.ts`: platform share URLs and share text for projects, portfolio views and assistant answers (Markdown flattened to plain text). `lib/schedule.ts`: gestation-period parsing, schedule status, summaries and completion buckets. `lib/chart-theme.ts`: validated series/status colors and shared chart styles. All covered by `tests/portfolio-insights.test.mjs`.

## Project detail

- `components/site-detail.tsx`: project hero, financial KPIs, fiscal-year chart/table, and CSV download.
- `components/site-fiscal-year-chart.tsx`: lazily loaded annual funding visualization.
- `components/site-financial-analytics.tsx`: allocation donut, cumulative fiscal-year funding and annual execution-rate charts.
- `components/site-insights.tsx`: `SiteContext` (schedule vs spend card, district/portfolio benchmark) and `RelatedProjects`.
- `app/opengraph-image.tsx`, `app/sites/[siteId]/opengraph-image.tsx`, `components/og-card.tsx`: generated 1200×630 link-preview images; `generateMetadata` in the project route sets title/description for shared links. `lib/site-url.ts` resolves the public base URL.
- `lib/csv.ts`: shared CSV escaping and formula-prefix neutralization used by both export actions.

## App Router and shared data

- `app/layout.tsx`: metadata, CSS and root shell.
- `app/page.tsx`: overview route.
- `app/sites/[siteId]/page.tsx`: dynamically selects a normalized project by its sheet-derived ID and displays a friendly unavailable state when missing.
- `app/loading.tsx`: shared route skeleton.
- `lib/types.ts`: domain contracts.
- `lib/excel.ts`: retained Excel parser plus shared header/row validation, grouping and normalization; runtime routes use its normalizer only.
- `lib/google-sheets.ts`: server-only service-account client, first-tab fetching, short process cache and normalization adapter.
- `app/api/dashboard-data/route.ts`: safe normalized-data API response for background refresh.
- `app/api/assistant/route.ts`: bounded, rate-limited question endpoint; validates input (`lib/assistant/request.ts`) and streams the agent's events as NDJSON.
- `lib/assistant-context.ts`: assistant message, source, place and stream-event contracts shared by the API and chat UI.
- `lib/assistant/agent.ts`: Gemini function-calling loop with streaming, retries, model fallback and answer synthesis from gathered results.
- `lib/assistant/tools.ts`, `dataset-tool.ts`, `grounding.ts`, `external.ts`: tool declarations and executors (sheet query, project lookup, web search, places, web pages) and the Wikipedia/OpenStreetMap clients.
- `lib/assistant/openai-compatible.ts`, `backup-provider.ts`: Groq/NVIDIA (OpenAI-compatible) client — live web search via Groq `browser_search`, backup tool-using agent and answer synthesis.
- `lib/assistant/project-lookup.ts`, `geo.ts`, `web-sources.ts`, `links.ts`, `markdown.ts`, `language.ts`, `openai-stream.ts`, `rate-limits.ts`: pure, unit-tested helpers (matching, distance/map links/URL safety, response parsing, link allow-listing, Markdown blocks and tables, reply-language detection, SSE/tool-call parsing, provider retry hints and per-model cooldowns).
- `lib/data-schema.ts`: discovers queryable normalized and extra source fields, types and units from the live sheet schema.
- `lib/dataset-query.ts`: validates whitelisted query plans and deterministically executes filters, grouping, ranking, aggregations, calculations, scenarios and data profiles.
- `lib/gemini.ts`: server-only Gemini client factory, model configuration, sheet-query planner and error helpers.
- `lib/analytics.ts`: portfolio calculations.
- `lib/site-analytics.ts`: project fiscal-year series calculations.

Charts are isolated in client modules; the root layout and data definitions are not marked as client components. Continue this pattern when adding interactive visualizations.

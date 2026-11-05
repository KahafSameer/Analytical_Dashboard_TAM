# Components

## Application shell

- `components/dashboard-shell.tsx`: responsive fixed sidebar, navigation links, mobile header/drawer, profile popover and freshness-aware `PageTopline`. Gets live project counts from the dashboard data provider.
- `components/dashboard-data-provider.tsx`: one client-held normalized dataset, 30-second background polling, request deduplication, freshness/error state and stale-data retention.
- `components/assistant/assistant-widget.tsx`: compact floating assistant launcher, responsive chat panel, suggestions, bounded local history, safe text/Markdown rendering and accessible keyboard interaction.
- `components/ui.tsx`: shared `StatusBadge`, `ProgressBar`, `SectionHeading`, `EmptyState`, `KpiCard`, `ChartCard` and a milestone-data note. `MilestonePlaceholder` is a data-absence notice, not an implemented milestone timeline.
- `components/motion.tsx`: reusable viewport reveal and chart entrance hooks used to keep animation logic small and localized.

## Portfolio

- `components/sites-overview.tsx`: overview composition and portfolio KPIs; obtains the summary and fiscal-year rollup from the analytics helpers.
- `components/portfolio-filter-bar.tsx`: global search (Ctrl K), district, spend-status and financial-progress filters. The filter state lives in `sites-overview.tsx` and drives every KPI, chart, the register and the CSV export on the overview page. `?q=` pre-fills the search.
- `components/project-register.tsx`: sortable, paginated project table (default) with an optional card view. Card imagery is hidden when every project shares the same fallback photo.
- `lib/portfolio-filters.ts`: pure filter/sort helpers (`filterSites`, `sortSites`, `getUnspentRelease`, `formatLocation`), covered by `tests/portfolio-filters.test.mjs`.
- `components/site-card.tsx`: image-led project card and navigation.
- `components/portfolio-chart.tsx`: responsive portfolio allocation/utilization chart.
- `components/portfolio-analytics.tsx`: district funding, category mix, progress distribution and derived financial signals.
- `components/lazy-portfolio-charts.tsx` and `components/lazy-site-charts.tsx`: defer below-the-fold chart modules until they approach the viewport; chart data remains available in semantic tables.
- `components/use-near-viewport.ts`: shared viewport-observation hook for deferred chart loading.
- `components/portfolio-export-button.tsx`: downloads the currently loaded Google Sheets portfolio rows as CSV.

## Project detail

- `components/site-detail.tsx`: project hero, financial KPIs, fiscal-year chart/table, and CSV download.
- `components/site-fiscal-year-chart.tsx`: lazily loaded annual funding visualization.
- `components/site-financial-analytics.tsx`: allocation donut, cumulative fiscal-year funding and annual execution-rate charts.
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
- `app/api/assistant/route.ts`: bounded, rate-limited question endpoint; discovers the current schema, obtains/validates a generic query plan, executes it locally, and returns a concise answer and result references.
- `lib/assistant-context.ts`: assistant message/source contracts shared by the API and chat UI.
- `lib/data-schema.ts`: discovers queryable normalized and extra source fields, types and units from the live sheet schema.
- `lib/dataset-query.ts`: validates whitelisted query plans and deterministically executes filters, grouping, ranking, aggregations, calculations, scenarios and data profiles.
- `lib/gemini.ts`: server-only Gemini query planner and grounded natural-language answer generation.
- `lib/analytics.ts`: portfolio calculations.
- `lib/site-analytics.ts`: project fiscal-year series calculations.

Charts are isolated in client modules; the root layout and data definitions are not marked as client components. Continue this pattern when adding interactive visualizations.

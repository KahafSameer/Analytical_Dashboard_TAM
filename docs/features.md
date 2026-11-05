# Features

## Portfolio overview (`/`)

- Summary metrics for project count, cost-weighted financial progress, expenditure, and projects with recorded spend.
- Portfolio cards with a sheet-supplied image where available (otherwise a shared fallback), source category/type where available, district, title, source code, financial progress bar and detail link.
- Live search, clear-search behavior, filter panel, sorting and a no-results state.
- Filters: region, category, spend status and financial-progress range.
- Sorting: most financial progress, name and financial activity status. The workbook has no row-level update timestamp.
- Portfolio-wide expenditure by fiscal year.
- District funding comparison, with a choice of approved, allocated, released or utilized amount.
- Source-category cost mix; when no category/type column exists, projects use the neutral “Tourism project” value and are not classified from their names.
- Project distribution by financial progress band.
- Insight cards highlighting spend, allocation and category patterns.

## Project detail (`/sites/[siteId]`)

- Project details, source code, district, gestation range, category, status and overall financial progress.
- Project financial KPIs.
- Allocation/release/utilization by fiscal year, shown as a grouped bar chart and a breakdown table.
- Additional charts: allocation utilization donut, cumulative fiscal-year funding and annual release/utilization rates.
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
- Questions outside dashboard data, missing sites and unavailable source/API states receive concise non-technical responses. The assistant does not render HTML.
- Gemini 3.5 Flash-Lite uses `GEMINI_API_KEY` on the server only. A 1,500-character question limit, bounded six-message history, 16 KB request cap and process-local request limit protect the endpoint.
- Answers follow the user's language and writing script; both query planning and answer generation happen server-side.

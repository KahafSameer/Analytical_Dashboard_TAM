# Features

## Portfolio overview (`/`)

- Summary metrics for project count, cost-weighted financial progress, expenditure, and projects with recorded spend.
- Portfolio cards with a workbook-supplied image where available (otherwise a shared fallback), source category/type where available, district, title, source code, financial progress bar and detail link.
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

## Master workbook

The root-level `Scheme Details for DAT 11-03-2026.xlsx` workbook is the sole source of all portfolio records. The server parses its first worksheet through `lib/site-repository.ts` and `lib/excel.ts`. Projects and detail analytics are generated from the normalized records. Replacing the workbook requires restarting/redeploying the server to refresh its process cache. No browser upload or local-storage project repository is present.

## Export

- Project export downloads the project's source financial fields and fiscal-year breakdown as CSV.
- Portfolio export downloads the records loaded from the master workbook as CSV.
- Neither export is an Excel `.xlsx` file, PDF report, signed report or official statement.

## Navigation and loading

The sidebar and mobile drawer share the workspace navigation. `app/loading.tsx` provides skeleton UI. Unknown project IDs and unavailable/invalid workbooks display friendly states.

## Empty states

Search/filter no-results and missing annual funding have designed empty states. Several chart-level no-data branches are also present. Further QA should check all-zero and partial-schema workbooks.

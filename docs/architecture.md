# Architecture

## Summary

The Next.js App Router application uses one Excel workbook as the only project-data source. `lib/site-repository.ts` reads the root-level master workbook and passes its bytes to the reusable parser in `lib/excel.ts`. That parser validates the sheet, discovers rows/columns, groups project records and normalizes them into `Site[]`. Both portfolio and detail pages use this same dataset. No parallel normalized JSON or per-site Excel files are maintained.

```text
Scheme Details for DAT 11-03-2026.xlsx
                │
                ▼
lib/site-repository.ts ── reads once; caches successful result per process
                │
                ▼
lib/excel.ts ── SheetJS → header discovery → row grouping → normalized Site[]
                │
                ├── app/page.tsx
                │      └── SitesOverview → search/filter/sort cards + portfolio analytics
                └── app/sites/[siteId]/page.tsx
                       └── select project by dynamic ID → project-specific analytics

Normalized Site[]
       ├── lib/analytics.ts       portfolio aggregates
       └── lib/site-analytics.ts  project fiscal-year chart series
```

## Repository map

- `Scheme Details for DAT 11-03-2026.xlsx`: single master data source.
- `lib/excel.ts`: shared parser, header matching, dynamic fiscal-year discovery, identity selection, duplicate grouping and normalization.
- `lib/site-repository.ts`: server-only filesystem access and process-level cache boundary.
- `lib/types.ts`: normalized project and fiscal-year contracts.
- `lib/analytics.ts`, `lib/site-analytics.ts`: calculations independent of workbook column names.
- `app/`: Server Component routes/layout and stylesheet.
- `components/`: reusable UI; client components are used where interaction or Recharts requires them.
- `docs/`: project documentation.

## Source-to-view flow

The master workbook is read from the project root using `process.cwd()`. The first worksheet is parsed with SheetJS. Project identity uses GS No when available, otherwise Project ID/Site ID/Project Code, and finally a name-plus-district fallback. Rows with the same stable identity are grouped and their financial totals/fiscal-year values are combined.

Fiscal-year series are discovered from matching allocation/release/utilization header names; the parser does not hard-code the 2024–2027 range. Display fields such as category and image are taken from the workbook when available. If absent, the normalized record uses a generic category and presentation image rather than a site-specific value.

The parser returns a normalized `Site[]` and skipped-row count. Shared analytics consume only normalized records. The portfolio creates one card per normalized project; the detail route dynamically selects the matching ID and calculates charts from that project's normalized fiscal-year data.

## Rendering and lifecycle

- `app/layout.tsx` and route files are Server Components. The root shell receives the project count from the same parsed workbook.
- The root layout and overview display a friendly data-source error if the master file cannot be read; the overview reports skipped non-empty rows.
- `app/sites/[siteId]/page.tsx` looks up the requested ID in the workbook-derived dataset; unknown IDs receive an unavailable-project state.
- `components/site-grid.tsx` owns interactive search/filter/sort state, not data loading or parsing.
- `components/site-detail.tsx` is client-rendered for CSV download; its project record is selected by the server route.
- The repository caches the first successful read/parse in memory for the process. Replacing the workbook requires a server restart/redeploy to refresh the cache.

## Future data-source boundary

UI components depend on normalized records and analytics functions, not SheetJS row structures. A future Google Sheets or API integration should replace/adapt the repository in `lib/site-repository.ts` and map its response to the same normalized model. Keep credentials and network access on the server side.

## Explicitly absent

There is no database, application API, authentication, user editing, Google Sheets client, per-site workbook architecture, checked-in duplicate `data/sites.json`, or browser local-storage project repository.

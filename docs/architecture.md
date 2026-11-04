# Architecture

## Summary

The dashboard uses a single Google Spreadsheet as its runtime source of truth. A server-only repository obtains the first worksheet through Google Sheets API v4, maps its rows using the same normalization functions retained in `lib/excel.ts`, and returns normalized records. Existing analytics and UI remain data-source independent.

```text
Google Spreadsheet
       │ Sheets API v4, read-only service account
       ▼
lib/google-sheets.ts ── credential validation, API calls, server cache
       │
       ├── app/page.tsx
       ├── app/sites/[siteId]/page.tsx
       └── app/api/dashboard-data/route.ts ── periodic browser refresh
                    │
                    ▼
lib/excel.ts: normalizeSheetRows(headers, rows, tabName)
                    │
                    ▼
lib/types.ts: DashboardData / Site[] / FiscalYear[]
       ├── lib/analytics.ts
       ├── lib/site-analytics.ts
       └── DashboardDataProvider → existing cards, detail pages and charts
```

## Server repository and normalization

- `lib/google-sheets.ts` is marked server-only. It reads `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, and `GOOGLE_PRIVATE_KEY`, authenticates with `spreadsheets.readonly`, discovers the first tab, fetches its values and calls the shared normalizer.
- `lib/excel.ts` retains the prior workbook parser and exports `normalizeSheetRows`, the shared header and row mapping path. The current routes do not open the local Excel file.
- `lib/types.ts` contains the normalized model and response type. Analytics and components do not depend on Google API row formats.
- The repository coalesces concurrent requests and caches successful parsed data in memory for 20 seconds per warm process.
- `app/api/dashboard-data/route.ts` exposes only normalized data and safe errors; it is uncached at the HTTP layer.

The first spreadsheet tab is treated as the dataset. Row 1 must contain the headers previously accepted from the workbook. Stable IDs are generated from GS No, another recognized project identifier, or name plus district. Fiscal-year groups are discovered from annual allocation/release/utilization header labels.

## Rendering and refresh

The App Router overview and detail routes fetch through the server repository and pass normalized initial data into client components for server rendering. `DashboardDataProvider` keeps one client copy for the active dashboard, updates the sidebar count, and polls the API every 30 seconds while the tab is visible. The same dataset drives portfolio filters, analytics and project detail lookup; successful refreshes update React state without reloading the document.

If refresh fails, the provider retains the last valid data and exposes a stale-data warning. Empty or malformed API responses are not accepted as replacement data. The server cache is only per-instance; no filesystem, persistent store, or background worker is required.

## Security boundaries

Google credentials and API calls are restricted to `lib/google-sheets.ts` on the server. Client modules call only the application endpoint, which returns `DashboardData` and safe error text. Never add credentials to client code or `NEXT_PUBLIC_*`.

## Explicitly absent

No database, write access, Google Sheets editing, authentication system, per-site spreadsheet, permanent cache, scheduled background process, or user upload flow is included.

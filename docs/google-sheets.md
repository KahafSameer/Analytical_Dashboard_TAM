# Google Sheets

## Current implementation status

**Google Sheets is not integrated.** The current application reads one master Excel workbook from the project root using a server-side repository. There is no Google Sheets URL/ID configuration, Sheets API client, OAuth flow, service account, environment variable, synchronization job or write-back behavior.

The master workbook is named `Scheme Details for DAT 11-03-2026.xlsx`; it is parsed at runtime into a normalized in-memory model. Google Sheets remains a possible future replacement for the repository, not a current source or mirror.

## Recommended future read-only integration

Before implementation, select an access model:

1. **Published, intentionally public sheet:** fetch a published CSV from a server-side route only if public exposure is approved. Do not treat an obscure URL as access control.
2. **Private department sheet:** use server-side Google API credentials and an appropriately scoped service account or OAuth design, after access ownership and permission requirements are agreed.

Keep the sheet API behind a server-side repository/adapter, map sheet records into the existing `Site` model, validate and normalize records, and keep client bundles free of credentials. Define caching, refresh, quota handling and error UI. Preserve one authoritative source rather than introducing an unsynchronized second copy. Never make a private sheet public just to simplify the prototype.

## Candidate worksheet schema

If migrating to Sheets, provide stable project identifiers (`Project ID`, `GS No`), project metadata (`Name`, `Description`, `District`, `Gestation Period`), totals (approval, allocation, release, utilization), financial progress, and annual allocation/release/utilization columns. A normalized `Projects` tab plus a `FiscalYears` tab can support future extension:

- `Projects`: one row per stable project ID and project metadata.
- `FiscalYears`: one row per project ID and fiscal-year label, with allocation, release and utilization amounts.

No such Google Sheets structure is configured or consumed by the application today.

## Configuration

There are **no Google Sheets environment variables** in the project. If integrating a private sheet later, keep credentials only in deployment secrets, document the minimum required scopes, and add `.env.example` with names/placeholders only—never real private keys. Avoid exposing API keys in `NEXT_PUBLIC_*` variables.

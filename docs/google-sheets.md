# Google Sheets integration

## Status and data flow

Google Sheets is the dashboard's single runtime source of truth. The first worksheet of one master spreadsheet is read through the Google Sheets API v4 by the server-only `lib/google-sheets.ts` repository:

```text
Google Spreadsheet
    → Google Sheets API (read-only service account)
    → app/api/dashboard-data (server endpoint)
    → lib/excel.ts normalizeSheetRows (shared header/row mapper)
    → normalized Site[] / fiscal years
    → existing analytics and UI
```

The existing Excel parser remains available as an alternate input adapter, but the application routes no longer read the local workbook. The Google Sheet should retain the same first-row headers and project/annual financial columns as the former workbook. The repository reads the first tab automatically and maps its header row into the existing normalized model; it does not depend on a tab name.

## Spreadsheet setup

1. Create/choose one Google Cloud project and enable **Google Sheets API**.
2. Create a Google Cloud service account. No downloaded service-account JSON file is needed by this application.
3. Share the master spreadsheet with `GOOGLE_SERVICE_ACCOUNT_EMAIL` as a **Viewer**.
4. Configure the environment variables below in local `.env.local` and in Vercel for every required deployment environment.
5. Redeploy/restart the app after changing environment values.

The first worksheet must have a supported project name header (`Name`, `Project Name`, `Site Name`, or `Scheme Name`) and supported financial total or annual funding headers. Identity, description, district, category, image and fiscal-year header aliases are normalized by `lib/excel.ts`. Missing optional values use the same normalized fallbacks as before; unsupported/missing required headers produce a friendly error instead of fabricated metrics.

## Authentication and environment

`.env.example` contains placeholders only:

```dotenv
GOOGLE_SHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
```

- `GOOGLE_SHEET_ID`: ID in the spreadsheet URL.
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: service account's `client_email`, granted Viewer access to the spreadsheet.
- `GOOGLE_PRIVATE_KEY`: service account private key from Google Cloud; multiline newlines may be encoded as literal `\n`.

Credentials are read only inside `lib/google-sheets.ts`, with the narrow `spreadsheets.readonly` OAuth scope. They are never returned by the API endpoint or imported in client bundles. Use Vercel Environment Variables for Preview/Production secrets. Never prefix these variables with `NEXT_PUBLIC_`, commit private keys, or commit a service-account JSON file.

## API endpoint, refresh and cache

`GET /api/dashboard-data` returns normalized `sites`, `sheetName`, `skippedRows`, and `fetchedAt`; it never returns authentication material. Responses use `Cache-Control: no-store`. The dashboard polls once every 30 seconds while the browser tab is visible and only one in-flight request is allowed. KPI, charts, cards and detail pages read the same in-memory client data and update without a page reload.

The server repository coalesces concurrent requests and caches a successful normalized response for 20 seconds per warm serverless instance. The cache is an optimization, not durable storage; Vercel may start multiple instances, and each instance may refresh independently. API calls have a timeout. No long-running job or filesystem persistence is required.

## Failure behavior

Missing environment values, invalid credentials, permission errors, empty sheets and unsupported columns are mapped to safe, user-facing messages. The route returns a generic error response, not raw Google errors or credentials. A background refresh failure preserves the latest client-held data and shows the small stale-data indicator; the next 30-second cycle retries. With no previously loaded data, the page offers a retry action.

## Local development

Copy `.env.example` to `.env.local`, fill in the values using a private credential source, make sure the spreadsheet is shared with the service account, then run `npm run dev`. Do not paste credentials into source code, issues, logs, or Markdown documentation.

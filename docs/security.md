# Security

## Credentials and service account

- `GOOGLE_PRIVATE_KEY`, service-account email, and spreadsheet ID are server environment variables. `.env.example` contains blank placeholders only.
- The Sheets client is isolated in `lib/google-sheets.ts`, which imports `server-only`. It uses the read-only `spreadsheets.readonly` scope.
- The service account should have Viewer access to only the one master spreadsheet. Do not use a credential JSON file or commit secrets.
- Never prefix credentials with `NEXT_PUBLIC_`, log them, return them from `/api/dashboard-data`, or paste them into issues or documentation.
- Configure local secrets in ignored `.env.local`; configure Vercel secrets through Project Settings → Environment Variables. Rotate any credential that has been exposed.

## API and data

`GET /api/dashboard-data` is a read-only endpoint. It returns normalized public dashboard data and safe error messages, not Google API responses or authentication material. It sets `Cache-Control: no-store`; the server repository applies only a short in-memory cache. The endpoint does not accept a spreadsheet ID or arbitrary range from the caller.

Only publish a spreadsheet whose contents are approved for every dashboard visitor. The route has no user authentication or authorization because the prototype is publicly readable; do not assume obscurity of the dashboard URL protects financial records.

## Input handling

Google Sheets values are external data. `lib/excel.ts` normalizes supported header names and values, drops invalid project rows, and UI renders strings as text. It does not evaluate formulas or treat cell contents as HTML. Missing required headers and empty sheets fail gracefully.

## Deployment and dependencies

Use HTTPS and Vercel environment-variable protections, and restrict Preview secrets to trusted contributors where appropriate. Review dependency updates and Google Cloud access periodically. `googleapis` is used server-side only; avoid bundling it into client components.

There is no write access, user file upload, database, CSP/security-header policy, account system, or formal security monitoring in the prototype.

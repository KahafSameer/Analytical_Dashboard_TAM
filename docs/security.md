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

## Gemini assistant

- `.env.example` contains only the blank `GEMINI_API_KEY=` placeholder. Configure the key in ignored local environment files or Vercel server environment variables; never use a `NEXT_PUBLIC_` prefix.
- `lib/gemini.ts` is server-only and calls Gemini 3.5 Flash-Lite. Browser code calls only `POST /api/assistant`; the key is not returned, logged, or sent to the browser.
- The route bounds JSON bodies, message length and recent history, validates roles/content, and applies a process-local request limit. Vercel instances have independent limits; this is a basic abuse guard, not a distributed quota system.
- Gemini receives a live schema and bounded conversation to plan; TypeScript validates all field IDs and whitelisted operations before querying local normalized records. Answer generation receives the deterministic result and only relevant field metadata, not raw rows or the full dataset. Source values, labels and user/history text are untrusted.
- Responses contain answer text and selected data references. The UI renders text and limited Markdown using React nodes; model output is never interpreted as HTML.
- Questions outside the normalized source (for example status, delays, activities, milestones, physical progress or historical changes) are explicitly declined.
- The planner cannot execute code, SQL, arbitrary expressions or fields not present in the discovered schema. Safe arithmetic is restricted to fixed difference/ratio/percent-of operations over numeric fields; query limits and filter/aggregation counts are validated server-side.

If a key has appeared in a source file, commit, log, or shared environment, revoke/rotate it with Google AI Studio immediately and update the server environment. Replacing a local example file does not remove prior Git history.

## Input handling

Google Sheets values are external data. `lib/excel.ts` normalizes supported header names and values, drops invalid project rows, and UI renders strings as text. It does not evaluate formulas or treat cell contents as HTML. Missing required headers and empty sheets fail gracefully.

Both CSV exports pass through `lib/csv.ts`, which quotes cells and prefixes text beginning with spreadsheet formula characters (including when preceded by whitespace); numeric cells remain numeric values.

## Deployment and dependencies

Use HTTPS and Vercel environment-variable protections, and restrict Preview secrets to trusted contributors where appropriate. Review dependency updates and Google Cloud access periodically. `googleapis` is used server-side only; avoid bundling it into client components.

There is no write access, user file upload, database, CSP/security-header policy, account system, or formal security monitoring in the prototype.

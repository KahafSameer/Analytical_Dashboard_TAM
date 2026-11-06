# Deployment

## Prerequisites

- Node.js compatible with the project's Next.js 16 version and npm.
- One Google Cloud project with the **Google Sheets API enabled**.
- A Google Cloud service account granted Viewer access to the master spreadsheet.
- Vercel configured with the required server-side environment variables.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Set `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, and `GEMINI_API_KEY` in `.env.local`; never commit that file.
3. Share the master spreadsheet with the service account email as Viewer.
4. Run:

```powershell
npm install
npm run dev
```

The API reads the first tab and expects the same first-row column headers as the previous master workbook.

## Vercel

1. Select the repository and keep the **Next.js** framework preset/default build and output settings.
2. In Project Settings → Environment Variables, create the three Google Sheets variables and `GEMINI_API_KEY` for Production and any trusted Preview/Development environments.
3. Enter the private key exactly as a secret. If entered with escaped newlines (`\n`), the server converts them to newline characters.
4. Confirm the spreadsheet is shared with the configured service-account email.
5. Redeploy after setting or rotating credentials. Do not set a custom output directory such as `public` or `.next`.
6. Optional: set `GROQ_API_KEY` (live web search and backup model for the assistant) and `NEXT_PUBLIC_SITE_URL` (the public address, e.g. `https://tourism.example.org`). On Vercel the production domain is used automatically when `NEXT_PUBLIC_SITE_URL` is not set.

### Link previews

Shared links (WhatsApp, Facebook, X, LinkedIn, Telegram) show a generated preview card from `app/opengraph-image.tsx` and `app/sites/[siteId]/opengraph-image.tsx`. Messaging apps fetch these images from the public URL, so previews only appear for a deployed, publicly reachable site — not for `localhost`. After deploying, check a project link with a preview debugger (for example Facebook's Sharing Debugger) to refresh any cached preview.

The application does not use a local workbook, service-account file, filesystem persistence, or a permanent Node process. Sheets API calls execute in serverless route/page invocations; the 20-second memory cache is opportunistic per warm instance.

## Validation

```powershell
npm run lint
npm run typecheck
npm run build
```

The build does not require Google or Gemini credentials because routes (including the preview images) are dynamic; runtime credentials must exist for those integrations to succeed. After deployment, verify `/`, a `/sites/[siteId]` link, `/opengraph-image`, `GET /api/dashboard-data`, a filtered view link (e.g. `/?district=Lahore`), and a dashboard question in the assistant.

## Operational notes

The browser refreshes once per 30 seconds while visible. Monitor Google API quota and Vercel function errors. Updates to the sheet appear on the next successful refresh; no redeploy is needed for data changes. Changes to Vercel environment variables require a new deployment.

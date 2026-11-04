# Deployment

## Prerequisites

- Node.js compatible with the installed Next.js 16 version.
- npm.
- Network access to install dependencies. SheetJS is currently installed from a SheetJS CDN tarball, not a conventional npm registry version.
- Network access at runtime for remote Unsplash images and Google Fonts unless those assets are replaced or self-hosted.

## Local development

```powershell
npm install
npm run dev
```

Open the local URL printed by Next.js. The default development server uses port 3000 when available.

## Validation and production

```powershell
npm run lint
npm run typecheck
npm run build
npm run start
```

The application reads the master workbook from the project root at runtime. Include `Scheme Details for DAT 11-03-2026.xlsx` in the deployment artifact and ensure the runtime can read it. Routes are dynamic so workbook data is not baked into a build-time static portfolio page. The production start command requires an available port; choose a different port through the standard Next.js `PORT` environment variable when 3000 is already occupied.

## Deployment configuration

No runtime secrets or environment variables are required by the current application. There are no Google Sheets credentials to configure. Keep the framework preset compatible with Next.js App Router. Include the workbook and allow Next.js image optimization to fetch configured Unsplash images, or use local images instead.

For a public deployment, first confirm that the supplied workbook and all financial records are approved for publication. Add the required privacy, access, logging, security headers and operational policies before presenting this prototype as an official system.

## Data update procedure

1. Review and approve the replacement master workbook.
2. Replace the root workbook while retaining any required backup outside the deployed application artifact.
3. Validate sheet/header structure, normalized project IDs, duplicate grouping and calculated totals.
4. Run lint, typecheck, data checks and production build.
5. Deploy/restart the app so the process cache reloads the workbook; verify overview and representative detail routes.

The repository does not generate a JSON snapshot. Replacing the workbook does not invalidate a running process's in-memory cache; restart/redeploy to load the updated source. Do not add a normalized project JSON copy as a second source of truth.

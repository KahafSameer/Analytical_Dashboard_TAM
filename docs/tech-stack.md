# Technology stack

Versions below reflect the root `package.json` when this document was authored. Use the lockfile and package manifest as the authoritative versions.

| Technology | Current package | Role |
|---|---|---|
| Next.js App Router | `next` `^16.4.4` | React application, routing, server-side Sheets access and production build |
| React / React DOM | `^19.1.0` | UI composition and interactive components |
| TypeScript | `^5.8.3` | Domain types, UI contracts and build-time checking |
| Tailwind CSS | `^4.3.4` | Tailwind CSS framework and processing integration; much of the bespoke visual system is authored in `app/globals.css` |
| Recharts | `^3.10.1` | Responsive, tooltip-enabled charts |
| Motion for React | `motion` | Viewport reveals, navigation transitions, counts, progress and chart entrances |
| Lucide React | `^1.67.0` | Interface iconography |
| SheetJS / `xlsx` | SheetJS `0.20.3` tarball | Retained Excel parser/normalization adapter; not used for runtime source retrieval |
| Google APIs | `googleapis` | Read-only access to the master Google Spreadsheet from server code |
| ESLint | `^10.14.0` | Static linting |
| `eslint-config-next` | `^16.4.4` | Next.js and React lint rules |
| `@tailwindcss/postcss` | `^4.3.4` | Tailwind v4 PostCSS plugin |
| `clsx`, `tailwind-merge` | `^2.1.1`, `^2.6.0` | Present utility dependencies; verify their use before expanding the component system |

## Why these technologies

- App Router Server Components keep Google Sheets access on the server and provide request-time project selection.
- TypeScript makes the normalized record the stable boundary between sheet columns and UI.
- Recharts provides responsive financial visualizations without adding a separate charting service.
- Motion for React drives small, viewport-triggered transitions in isolated client components, with system reduced-motion support.
- The shared normalizer in `lib/excel.ts` preserves the established column mapping and supports the retained offline Excel adapter without coupling the UI to source formats.
- Lucide supplies consistent lightweight line icons.

There is no UI primitive package dependency: the project uses custom React components and CSS rather than a configured shadcn/ui installation. There is also no database, test runner, or end-user authentication provider.

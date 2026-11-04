# Routes

| Route | Implementation | Behavior |
|---|---|---|
| `/` | `app/page.tsx` → `components/sites-overview.tsx` | Loads and parses the master workbook on the server, then renders the generated project cards, filters, financial summaries, charts and export. The page uses Suspense for query-dependent search initialization. |
| `/sites/[siteId]` | `app/sites/[siteId]/page.tsx` → `components/site-detail.tsx` | Loads normalized records from the master workbook and selects the matching project ID dynamically for detail analytics. Unknown IDs and source failures display friendly states. |

`app/loading.tsx` is the App Router loading fallback. The master workbook is cached per server process; refresh the process after replacing it. The project is not configured with dedicated API routes.

## Route identity notes

Project URLs use a stable ID derived in priority order from GS No, another project identifier, or project name plus district. The route list is not hard-coded; it is resolved against the parsed workbook at request/render time.

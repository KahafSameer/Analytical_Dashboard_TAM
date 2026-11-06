# Routes

| Route | Implementation | Behavior |
|---|---|---|
| `/` | `app/page.tsx` → `components/sites-overview.tsx` | Loads and normalizes the master Google Sheet on the server, then renders generated project cards, filters, financial summaries, charts and export. The page uses Suspense for query-dependent search initialization. |
| `/sites/[siteId]` | `app/sites/[siteId]/page.tsx` → `components/site-detail.tsx` | Loads normalized records from Google Sheets and selects the matching project ID dynamically for detail analytics. Unknown IDs and source failures display friendly states. |
| `/api/dashboard-data` | `app/api/dashboard-data/route.ts` | Server-side read-only normalized data endpoint polled by the active dashboard every 30 seconds. |

`app/loading.tsx` is the App Router loading fallback. Google Sheets data is cached briefly per warm server process. Sheet edits are visible after the next successful browser poll; changing credentials requires a redeployment.

## Route identity notes

Project URLs use a stable ID derived in priority order from GS No, another project identifier, or project name plus district. The route list is not hard-coded; it is resolved against the normalized Google Sheets data at request/render time.

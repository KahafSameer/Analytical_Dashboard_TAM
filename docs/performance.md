# Performance

## Data access and refresh

- One centralized server repository fetches the first worksheet and normalizes it once per request flow; UI components never call Google.
- Concurrent fetches in a warm serverless instance share an in-flight promise. Successful normalized data is cached for 20 seconds in process memory.
- The browser makes one `GET /api/dashboard-data` request every 30 seconds while the document is visible. A single in-flight guard, request timeout, tab visibility check and one shared provider avoid per-card/chart requests.
- The app polls data into React state; it does not reload the document. Failed refreshes preserve the last valid payload.
- Vercel may run multiple serverless instances with independent short-lived caches; no disk persistence or long-running process is required.

## Rendering

- App Router server pages obtain initial data server-side and pass normalized records to client-rendered analytics.
- Chart components remain isolated; the whole application is not converted into a client component.
- Next.js Image, responsive `sizes`, lazy card imagery, and viewport-triggered chart entrance animations remain in place.
- The data model is small for the current 89-project sheet; portfolio analytics are local calculations over the received normalized dataset.

## Considerations

Google API reads are two requests per uncached server fetch (spreadsheet tab metadata, then values). The 20-second cache amortizes page/API requests on each warm instance. Refresh happens only while the browser is visible; no server background polling occurs. A large sheet may need a narrower configured range or pagination, while keeping a single central repository.

Continue measuring mobile Core Web Vitals, chart cost, image loading and sheet/API latency. Do not shorten the 30-second client refresh cadence without checking Google API quota and traffic.

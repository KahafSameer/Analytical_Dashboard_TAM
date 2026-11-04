# Performance

## Implemented measures

- Server-side workbook parsing is cached in memory after the first successful load in a process.
- Responsive chart containers; chart code is isolated in client components instead of converting the entire application to a client tree.
- Next.js Image is used for project and hero images, with responsive `sizes`; cards lazy-load by default and the first visible card is eager.
- The first project hero image is marked priority.
- Site summaries and chart data are lightweight local computations over the current 89 normalized projects.
- Project routes are resolved from the workbook-derived dataset, not enumerated from a checked-in project list.

## Runtime considerations

- Unsplash images and Google Fonts are remote dependencies, so visual completeness and loading depend on network access, CDN behavior and image optimization.
- Charts use Recharts client-side and add hydration/JavaScript cost to analytical sections.
- `next.config.ts` permits the Unsplash host for optimized images.

## Follow-up measurement

Measure Core Web Vitals and mobile image LCP on a deployed build, evaluate local font hosting and local image assets, and profile chart rendering if the portfolio grows substantially. Replacing the workbook requires refreshing the running process because parsed data is cached. Consider pagination or virtualized card rendering for significantly larger datasets; all current projects are rendered as cards together.

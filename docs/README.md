# Fieldnotes — Project documentation

Fieldnotes is a tourism and heritage project-finance dashboard built with Next.js. One master Excel workbook is the single source of truth for the portfolio. A shared parser normalizes its project rows and feeds the portfolio and project analytics.

> **Integration note:** Google Sheets is not connected in the current implementation. The Google Sheets document below records that boundary and outlines a safe future integration; it does not imply that the application currently reads from or writes to Sheets.

## Documentation index

| Document | What it covers |
|---|---|
| [Overview](overview.md) | Purpose, audience, objectives and product scope |
| [Architecture](architecture.md) | App structure, rendering boundaries and data flow |
| [Technology stack](tech-stack.md) | Runtime, libraries and rationale |
| [Data model](data-model.md) | The normalized project/fiscal-year schema and source mapping |
| [UI and UX](ui-ux.md) | Visual system, interaction and accessibility |
| [Features](features.md) | Implemented feature behavior and boundaries |
| [Analytics](analytics.md) | Metrics, formulas, visualizations and data caveats |
| [Google Sheets](google-sheets.md) | Current non-integration and future configuration options |
| [Components](components.md) | Important reusable components and responsibilities |
| [Routes](routes.md) | App Router paths and rendering behavior |
| [Security](security.md) | Data handling, dependencies, secrets and deployment risks |
| [Performance](performance.md) | Current optimizations and areas to monitor |
| [Responsive behavior](responsive.md) | Desktop, tablet and mobile layout behavior |
| [Testing and QA](testing.md) | Available checks and a manual test checklist |
| [Implementation audit](audit-report.md) | Current strengths, limitations and material gaps |
| [Pros and cons](pros-cons.md) | Architectural trade-offs |
| [Future roadmap](future-roadmap.md) | Phased improvement recommendations |
| [Deployment](deployment.md) | Local run and production deployment |
| [Changelog](changelog.md) | Documented project milestones |

## Start here

1. Read [Overview](overview.md) and [Architecture](architecture.md).
2. Read [Data model](data-model.md) and [Analytics](analytics.md) before changing source fields or metrics.
3. Use [Components](components.md) and [Routes](routes.md) to locate the relevant UI.
4. Follow [Deployment](deployment.md) and [Testing and QA](testing.md) when validating a change.

For npm scripts and dependency versions, the source of truth is the root [`package.json`](../package.json). The master workbook at the project root is the source of truth for project records; normalized records are created in memory by `lib/excel.ts` and `lib/site-repository.ts`. There is no checked-in duplicate `data/sites.json`.

## Documentation maintenance

Update the relevant pages whenever a change modifies an architectural boundary, source schema, calculation, route, integration, or deployment assumption. Record user-visible and structural changes in [Changelog](changelog.md). Keep Google Sheets documentation explicit about whether an integration is proposed or implemented.

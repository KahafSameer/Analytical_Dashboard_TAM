# Implementation audit

**Audit basis:** repository contents and implemented behavior after the Google Sheets migration. This is a product/architecture audit, not a penetration test or formal accessibility certification.

## Implemented

- Next.js App Router application with portfolio overview and project detail routes.
- One master Google Spreadsheet as the only runtime project-data source; no duplicate project JSON or per-site spreadsheet architecture.
- Server-only Sheets repository, short per-instance cache and reusable normalized row mapping.
- Dynamic project identification/grouping and fiscal-year column discovery, normalized TypeScript model, portfolio and project financial analytics, filters and CSV exports.
- Responsive styling, loading/empty/error UI and reduced-motion handling.
- Build, lint and runtime integration must be revalidated after the Google Sheets migration; live API behavior requires authorized deployment credentials.

## Important gaps and risks

1. **No automated regression suite.** Parser and calculation checks were ad hoc and are not committed.
2. **Refresh cache is process-scoped.** Each warm Vercel instance caches successful results for 20 seconds; no shared/distributed cache is configured.
3. **Public data endpoint.** The prototype has no viewer authentication. Only publish sheet data approved for all visitors.
4. **Duplicate aggregation assumes split rows.** Rows with the same stable identity have amounts summed; repeated snapshots would be double-counted unless the source semantics are clarified.
5. **No dated history.** The workbook contains annual financial figures, not monthly transactions or activity/milestone records; those charts are intentionally absent.
6. **Fallback presentation fields.** The workbook lacks category/image columns, so records use a generic category and common image instead of inferred site-specific metadata.
7. **Source freshness and provenance.** There is no automated refresh, source checksum or field-level lineage.
8. **Data precision and semantics.** Annual sums may differ from totals through rounding. Financial progress is not physical construction progress.
9. **Accessibility remains to be audited.** Recharts are not a complete keyboard-accessible alternative to tabular data, and no screen-reader/contrast audit is configured.
10. **Deployment controls are not built in.** No auth, rate limiting, CSP/security header policy, observability or backup/restore exists.

## Recommendations before production use

- Confirm spreadsheet ownership, approved publication and duplicate-row aggregation semantics; add repeatable parser and analytics tests.
- Validate sheet content/shape, retain user-friendly error messages and test malformed rows.
- Confirm financial figures with the data owner and add date/source provenance to every report.
- Adopt a verified image library or approved local photography.
- Add unit tests for data parsing/calculations and browser-level route/export tests.
- Complete accessibility, privacy, dependency and production security reviews.

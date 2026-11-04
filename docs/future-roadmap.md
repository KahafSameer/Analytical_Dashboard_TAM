# Future roadmap

The sequence below is recommended; it is not a commitment that these features exist.

## Phase 1 — Confidence in the existing prototype

- Add repeatable unit tests for Excel normalization, ratios, annual series, category/district rollups and edge cases.
- Add browser tests for filters, detail navigation and CSV files.
- Confirm duplicate-row semantics with the workbook owner and test grouped values.
- Add repeatable parser/analytics test coverage for missing headers, malformed workbooks, duplicate IDs and changing fiscal years.
- Add source workbook version/date provenance and an operational refresh procedure.
- Add category, image and physical-progress fields only after verified source data is available.

## Phase 2 — Operational data source

- If live synchronization is needed, select a private Google Sheet, protected API or database based on source ownership and collaboration needs.
- Replace/adapt the server-side repository while preserving the normalized `Site` model and single-source policy.
- Define authentication/authorization, duplicate resolution, source freshness and audit history.
- Provide deliberate cache refresh and visible source version/last-successful-sync metadata.

## Phase 3 — Better analysis, when inputs exist

- Add month/quarter trend charts only when dated transaction or progress-history data is supplied.
- Add category/physical progress, milestone timelines, status distributions and activity tables only from corresponding verified records.
- Consider approved-cost vs release vs utilization variance alerts with formally agreed thresholds.
- Provide downloadable workbook reports and accessible chart data tables.

## Phase 4 — Production readiness

- Add observability, security headers, privacy notice, retention policy and incident/backup procedures.
- Self-host fonts and use approved/local image assets.
- Add accessibility and visual regression coverage.
- Profile larger portfolios and paginate or virtualize if required.

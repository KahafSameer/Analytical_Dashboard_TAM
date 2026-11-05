# Changelog

This is a user-oriented summary of the work represented in the current repository. It is not a release/tag history; inspect Git history for commit-level provenance.

## Unreleased — analytical dashboard overhaul

- Overview reorganized as filters → KPIs → funding flow → analytics → project register → export, so analysis is no longer below 89 project cards.
- One global filter bar (search, district, spend status, financial progress) now drives every KPI, chart, signal, the register and the CSV export, with a visible "Showing X of Y" status and a one-click reset.
- Added a sortable, paginated project register table (approved, released, utilized, unspent release, progress) as the default view; cards remain available and drop the duplicated fallback photo.
- Added a "Released, not yet spent" watchlist and an "Approved, not yet allocated" signal; the empty project-type chart is hidden when the source has no type labels.
- Raised the type scale (minimum text size 10px, body/secondary text 11–13px) and stopped chart axes from skipping category labels.
- Fixed invalid HTML (a button nested in the brand link), removed a non-functional sidebar chevron, hid "Not specified" placeholders in locations, and fixed a hydration mismatch for reduced-motion users.
- CSV export adds an unspent-release column and names filtered exports separately.

## Unreleased — Google Sheets source and live refresh

- Replaced runtime local Excel file access with a server-only Google Sheets API adapter using a read-only service account.
- Reused the existing row normalizer so the `Site`/`FiscalYear` model and analytics remain independent of source format.
- Added `/api/dashboard-data`, a 20-second per-instance cache and a single client refresh every 30 seconds while the tab is visible.
- Added a subtle freshness/stale-data indicator and previous-data retention when a background refresh fails.
- Added blank-only `.env.example`, service-account JSON ignore rules and setup/Vercel documentation.

## Earlier — master workbook normalization architecture

- Replaced the duplicate JSON/browser-import data architecture with a single root-level master workbook.
- Added server-side workbook repository with process-level cache and reusable parser/normalizer.
- Dynamically derive portfolio cards and project detail analytics from normalized workbook data, with typed error/empty states.
- Discover fiscal-year columns and group repeated project identifiers; removed local-storage import persistence.
- Removed the misleading “Recently updated” sort because the source has no row update timestamp.
- Updated documentation to describe the actual single-workbook implementation.

## Unreleased — motion design system

- Added Motion for React for viewport-based reveals, staggered/layout-aware project filtering, subtle route/navigation transitions and profile/filter feedback.
- Animated KPI count-ups and progress fills; financial charts now mount and animate once when entering view.
- Added mobile press feedback, hover-only card effects for fine pointers, and reduced-motion behavior.
- Updated responsive and design-system documentation.

## Earlier prototype work — analytics and UX

- Added project-wide and project-detail financial analytics, including district funding, category mix, progress distribution, allocation utilization, cumulative annual funding and execution rates.
- Added portfolio CSV export and workbook-provided project categories where available.
- Added responsive visual refinements, loading and empty states, reduced-motion handling and subtle entrance/hover animations.
- Added project/portfolio CSV exports.
- Added lint, typecheck and production build scripts/configuration.
- Added a comprehensive `/docs` documentation set.

## Data and scope notes

- Google Sheets is read-only. Authentication applies to the server's service account, not dashboard users.
- Database persistence, physical progress, activities, milestones, visitor analytics and dated monthly progress are not implemented.

## Maintaining this file

Add a dated or versioned entry for user-visible changes, source schema changes, new integrations and breaking behavior. Do not record a planned feature as shipped.

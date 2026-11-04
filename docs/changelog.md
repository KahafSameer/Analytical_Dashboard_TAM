# Changelog

This is a user-oriented summary of the work represented in the current repository. It is not a release/tag history; inspect Git history for commit-level provenance.

## Unreleased — master workbook source architecture

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

- Google Sheets synchronization, authentication, database persistence, physical progress, activities, milestones, visitor analytics and dated monthly progress are not implemented.
- Current source workbook: `Scheme Details for DAT 11-03-2026.xlsx`. The parser reads its first worksheet at runtime.

## Maintaining this file

Add a dated or versioned entry for user-visible changes, source schema changes, new integrations and breaking behavior. Do not record a planned feature as shipped.

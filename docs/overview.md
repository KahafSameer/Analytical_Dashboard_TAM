# Overview

## Purpose

Fieldnotes is a client-facing analytics prototype for reviewing tourism and heritage investment projects in Punjab, Pakistan. It turns a provided project-finance workbook into a searchable project catalogue and a set of portfolio- and project-level funding views.

## Goals

- Make a large list of public tourism projects understandable at a glance.
- Make individual projects and their reported budgets, releases and expenditure easy to inspect.
- Present amounts and percentages consistently, with source-data limitations visible.
- Provide a foundation for a later operational platform or API-backed product.

## Intended users

- Tourism department portfolio reviewers.
- Program and financial analysts.
- Government stakeholders reviewing project funding.
- Product and engineering teams validating an analytics workflow.

The application is a prototype, not an official financial system, approval workflow, or source-of-record.

## Current scope

- One root-level master workbook, `Scheme Details for DAT 11-03-2026.xlsx`, containing 89 project rows in its first worksheet.
- Dynamic project identification by GS No, then Project ID, then a name/district fallback; duplicate rows with the same stable identity are grouped.
- One reusable parser and normalized in-memory `Site[]` layer used by both overview and detail routes.
- Portfolio search, filters, sorting, summary metrics and funding visualizations.
- Project detail views are selected dynamically by filtering normalized records from the master workbook.
- CSV download for project or master-workbook portfolio summaries.
- Responsive layouts and keyboard-accessible controls.

The bundled source contains financial fields. It does **not** contain task/activity detail, physical completion, visitor statistics, a reliably dated expenditure history, or verified project milestones. Accordingly, the dashboard does not invent these measures.

## Product vocabulary

- **Project/site:** One tourism scheme or initiative listed in the workbook.
- **Financial progress:** The reported utilization divided by total approved cost (the workbook's overall financial progress field).
- **Fiscal year:** One of the workbook's annual funding periods.
- **Reporting area:** The district value reported for a project. Some source rows use values such as “Punjab” or “Multiple District”; the field is not necessarily a municipality.

## Not currently included

Google Sheets synchronization, database persistence, authentication, user roles, a separate domain API, PDF export, project editing, live government-system connections, activity tracking, and deployment-specific monitoring are not implemented.

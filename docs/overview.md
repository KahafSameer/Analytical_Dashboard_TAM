# Overview

## Purpose

Fieldnotes is a client-facing analytics prototype for reviewing tourism and heritage investment projects in Punjab, Pakistan. It turns a master Google Spreadsheet into a searchable project catalogue and portfolio/project financial views.

## Intended users

- Tourism department portfolio reviewers.
- Program and financial analysts.
- Government stakeholders reviewing project funding.
- Product and engineering teams validating an analytics workflow.

The application is a prototype, not an official financial system, approval workflow, or source-of-record.

## Current scope

- One Google Spreadsheet is the single source of truth for all projects.
- Server-side Google Sheets API access uses a read-only service account.
- A shared normalizer maps spreadsheet rows into the existing typed `Site[]` model.
- Portfolio cards, filters, project detail pages and financial analytics derive from the same normalized dataset.
- Client state refreshes every 30 seconds while the browser tab is visible; a refresh does not reload the page.
- Successful server responses are cached briefly per warm serverless instance; temporary refresh failures retain the previous client dataset.
- CSV download is available for project and portfolio data.
- Responsive layouts, animations and accessibility affordances remain as implemented.

The sheet contains financial fields but no task/activity detail, physical completion, visitor statistics, reliably dated expenditure history, or verified project milestones. The dashboard does not invent these measures.

## Product vocabulary

- **Project/site:** One tourism scheme or initiative listed in the master spreadsheet.
- **Financial progress:** Reported overall financial-progress value, with utilization/approved-cost fallback only if absent.
- **Fiscal year:** One of the annual funding periods discovered from column headers.
- **Reporting area:** Source district/location; not necessarily a municipality.
- **Data freshness:** Timestamp of the latest successful normalized fetch, with a stale-data warning after a failed background refresh.

Google Sheets editing, database persistence, authentication, user roles, PDF export, project editing, physical-progress tracking and live government-system connections are not implemented.

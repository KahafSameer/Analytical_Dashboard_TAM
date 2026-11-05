# Testing and QA

## Automated checks currently available

The project has focused Node-based regression tests for financial normalization diagnostics, generic category exclusion, CSV formula-prefix handling, dynamic schema discovery, query validation/execution, grouping, ranking, scenarios and statistical summaries. There is no browser-test or visual-regression framework. Available scripts:

```powershell
npm run test
npm run lint
npm run typecheck
npm run build
npm audit --omit=dev
```

For changes to the data layer, verify normalization and calculated totals against an approved sheet copy or the former workbook fixture; never print or commit credentials. Live integration checks require an authorized service account and spreadsheet.

## Manual QA checklist

### Navigation and overview

- [ ] `/` loads all valid projects from Google Sheets and portfolio summaries reconcile with source.
- [ ] Project card navigates to the matching detail route.
- [ ] Back navigation returns to the portfolio.
- [ ] Search supports project name, district, category, code and description; clear and empty states work.
- [ ] District, category, spend, progress-band and sorting controls work together.
- [ ] Keyboard shortcut Ctrl/Cmd+K focuses project search.

### Analytics

- [ ] Portfolio annual totals reconcile with the sheet within rounding differences.
- [ ] District summaries cover all records; category summaries include only projects with source-provided types.
- [ ] Portfolio charts expose expandable data tables as well as chart visuals.
- [ ] Financial-progress distribution counts total normalized projects.
- [ ] Project annual funding chart and table agree with source.
- [ ] Allocation utilization donut handles zero allocation and expenditure over allocation.
- [ ] Cumulative series is non-decreasing and uses fiscal years, not months.
- [ ] Annual execution rates avoid division by zero and may exceed 100%.
- [ ] Empty/partial sheet data displays a helpful state.

### Google Sheets and export

- [ ] Spreadsheet parses and normalized project identities match expected source rows.
- [ ] Missing configuration, invalid credentials, permission denial, empty sheet, missing required headers and skipped nameless rows have safe states.
- [ ] Dynamic fiscal-year columns and duplicate identity grouping behave correctly.
- [ ] Sheet edits appear in portfolio and detail analytics after the next successful 30-second refresh without reloading the browser.
- [ ] A failed refresh retains existing data, shows a stale-data indicator and retries on a later cycle.
- [ ] Project and portfolio CSV exports open correctly, have expected headers/amounts, and keep formula-leading source text inert.
- [ ] Assistant planner uses the current source headers, including extra columns, and returns only validated schema IDs.
- [ ] Assistant records/aggregate/grouped/analysis plans match independently calculated fixture results.
- [ ] Assistant asks for clarification or reports unavailable source fields rather than substituting or inventing values.
- [ ] Assistant follow-up queries preserve the intended conversation scope and answer in the latest user's language/script.

### Responsive/accessibility

- [ ] Check 320, 375, 390, 414, 768, 1024 and 1440+ px.
- [ ] No viewport horizontal overflow; tables may scroll within their container.
- [ ] Drawer opens, closes from close button/scrim and is keyboard reachable.
- [ ] Focus rings, accessible labels, progress semantics and image alt text are present.
- [ ] Reduced-motion preference disables animation.

### Production

- [ ] Build succeeds and representative sheet-derived detail routes respond.
- [ ] Image and font dependencies load or fail gracefully in the deployment environment.
- [ ] Test a production server on an available port and confirm overview and detail routes respond.

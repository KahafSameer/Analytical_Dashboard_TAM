# Testing and QA

## Automated checks currently available

The project has no committed unit-test, browser-test or visual-regression framework. Available scripts:

```powershell
npm run lint
npm run typecheck
npm run build
npm audit --omit=dev
```

For changes to the data layer, manually verify parser behavior against the master workbook and compare calculated totals with its source. These checks are not yet a repeatable committed test suite.

## Manual QA checklist

### Navigation and overview

- [ ] `/` loads all valid projects from the master workbook and portfolio summaries reconcile with source.
- [ ] Project card navigates to the matching detail route.
- [ ] Back navigation returns to the portfolio.
- [ ] Search supports project name, district, category, code and description; clear and empty states work.
- [ ] District, category, spend, progress-band and sorting controls work together.
- [ ] Keyboard shortcut Ctrl/Cmd+K focuses project search.

### Analytics

- [ ] Portfolio annual totals reconcile with the workbook within rounding differences.
- [ ] District/category summaries cover all records; tooltip values are legible.
- [ ] Financial-progress distribution counts total normalized projects.
- [ ] Project annual funding chart and table agree with source.
- [ ] Allocation utilization donut handles zero allocation and expenditure over allocation.
- [ ] Cumulative series is non-decreasing and uses fiscal years, not months.
- [ ] Annual execution rates avoid division by zero and may exceed 100%.
- [ ] Empty/partial workbook data displays a helpful state.

### Master workbook and export

- [ ] Master workbook parses and its number of normalized projects matches expected source rows/identities.
- [ ] Missing workbook, invalid workbook, missing required headers, empty projects and skipped nameless rows have friendly states.
- [ ] Dynamic fiscal-year columns and duplicate identity grouping behave correctly.
- [ ] Replacing the workbook and restarting the server updates portfolio and detail analytics.
- [ ] Project and portfolio CSV exports open correctly and have expected headers/amounts.

### Responsive/accessibility

- [ ] Check 320, 375, 390, 414, 768, 1024 and 1440+ px.
- [ ] No viewport horizontal overflow; tables may scroll within their container.
- [ ] Drawer opens, closes from close button/scrim and is keyboard reachable.
- [ ] Focus rings, accessible labels, progress semantics and image alt text are present.
- [ ] Reduced-motion preference disables animation.

### Production

- [ ] Build succeeds and representative workbook-derived detail routes respond.
- [ ] Image and font dependencies load or fail gracefully in the deployment environment.
- [ ] Test a production server on an available port and confirm overview and detail routes respond.

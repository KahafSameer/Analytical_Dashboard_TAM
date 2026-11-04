# Analytics

## Source and units

Metrics use the normalized projects from the single master workbook (currently 89 projects). Financial amounts are PKR millions. There is no activity-level dataset or transaction/date series. Fiscal-year labels are discovered from the workbook's annual funding headers; the current workbook has FY 2024–25, FY 2025–26 and FY 2026–27.

## Portfolio KPIs (`lib/analytics.ts`)

- **Project count:** number of records.
- **Total approved / allocated / released / utilized:** sum of the corresponding normalized amount.
- **Portfolio financial progress (weighted):** `sum(utilized) / sum(approvedCost)`. The label in the UI explains that it is weighted by approved cost.
- **Allocation utilization:** `sum(utilized) / sum(allocated)`.
- **Projects with spend:** count of projects where `utilized > 0`.
- **Projects with no spend:** count of projects where `utilized === 0`.
- **Mean progress:** arithmetic mean of per-project progress. It is calculated by the helper but not currently displayed as the main portfolio KPI.
- **Fiscal-year rollup:** group and sum annual allocation, release and utilized amounts across projects.

When denominators are zero, portfolio ratio helpers return zero. Percentages are represented internally as fractions and multiplied by 100 for display.

## Portfolio visualizations

- **Annual portfolio funding area chart:** total annual allocation and expenditure. The current chart does not display release even though the normalized data contains it.
- **Funding by district:** top eight districts by a user-selected funding amount; amount and project count are included in the chart tooltip.
- **Portfolio by project type:** donut slices represent total approved cost. Categories use a source category/type column where available; if absent, projects receive the generic `Tourism project` category rather than an inferred type.
- **Financial progress distribution:** counts in no-expenditure, 1–25%, 26–50%, 51–75%, and 76–100% bands. “No expenditure” is based on a zero financial-progress fraction, and bands exclude zero.
- **Signals:** remaining allocation is `max(totalAllocated − totalUtilized, 0)`; highest expenditure is the district with the largest aggregate utilization; investment category is the category with the largest approved total.

## Project calculations (`lib/site-analytics.ts`)

- **Allocation utilization donut:** shows `min(utilized, allocated)` as expenditure within allocation, `max(allocated − utilized, 0)` as remaining allocation, and `max(utilized − allocated, 0)` as expenditure above allocation. Zero-valued slices are omitted. The chart center shows `utilized / allocated` as a percentage; the shared percentage formatter does not cap this figure, so it can exceed 100%.
- **Cumulative funding:** for each fiscal year in order, take a running sum of annual allocation, release and utilization. This is a cumulative fiscal-year view, not monthly progress or an activity timeline.
- **Annual execution rates:** for years with a positive allocation, calculate `release / allocation × 100` and `utilized / allocation × 100`. Rates may exceed 100%.
- **Project financial progress:** use the workbook's `Project Overall Financial Progress %` fraction. The shared parser falls back to `utilized / approvedCost` only when that source field is absent.

## Interpretation and caveats

- The source calls these financial progress figures; they do not prove physical completion.
- Aggregated financial progress and arithmetic mean project progress answer different questions.
- Workbook totals and sums of annual fields may differ because of rounding or source reporting.
- Utilization may exceed allocation or releases; this is surfaced rather than clamped in source totals.
- District/category aggregations are descriptive, not performance rankings or quality assessments.
- A three-year annual series should never be presented as a smooth monthly trend.
- The parser discovers fiscal-year columns dynamically from annual allocation/release/utilization header names. A new header naming convention may still require an alias/parser update.

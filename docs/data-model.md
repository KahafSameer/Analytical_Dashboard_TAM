# Data model

## Normalized model

`lib/types.ts` defines the UI-facing `Site` and `FiscalYear` contracts. The UI and analytics must consume these types, not raw workbook headers.

### `Site`

| Field | Type | Meaning |
|---|---|---|
| `id` | `string` | Stable route ID, derived from GS No, another project identifier, or name/district fallback. |
| `projectId` | `string?` | Source Project ID where present. |
| `code` | `string?` | Source GS No where present. |
| `name` | `string` | Workbook Name/Project Name/Site Name/Scheme Name. Required for a usable project row. |
| `description` | `string` | Workbook description, falling back to project name. |
| `district` | `string` | District/Location or “Not specified”. |
| `region` | `string` | Province/Region where supplied; current provincial workbook defaults to Punjab. |
| `category` | `string` | Category/Project Type/Site Type from workbook, else neutral “Tourism project”. |
| `image` | `string` | HTTPS image from Image/Image URL/Photo URL, else a generic presentation fallback. |
| `gestationPeriod` | `string?` | Workbook gestation/delivery-period text. |
| `approvedCost` | `number` | Total approval cost in PKR millions. |
| `allocated` | `number` | Total allocation in PKR millions. |
| `released` | `number` | Total release in PKR millions. |
| `utilized` | `number` | Total utilization in PKR millions. |
| `overallProgress` | `number` | Fraction from 0 to 1; derives from reported overall financial progress or falls back to utilized/approved cost. |
| `currentYearProgress` | `number?` | Current-year financial-progress fraction, when available. |
| `fiscalYears` | `FiscalYear[]` | Dynamically discovered annual funding records. |

### `FiscalYear`

Each fiscal-year item has `label`, `allocation`, `release` and `utilized`. Amounts are numeric PKR millions; the year label is inferred from annual headers, rather than a hard-coded fixed list.

## Master workbook

The current master file is `Scheme Details for DAT 11-03-2026.xlsx`. It contains one worksheet (`Sheet1`) with 89 populated project records and source fields including:

- Identity and metadata: `Project ID`, `GS No`, `Name`, `Description`, `District`, `Gestation Period`.
- Totals: `Total Approval Cost`, `Total Funds Allocation In Millions`, `Total FD Release In Millions`, `Total Funds Utilization All Fys In Millions`.
- Progress: `Project Overall Financial Progress %`, `Project CFY Financial Progress %`.
- Annual groups for allocation, release and utilization. The parser discovers years in column headers and does not assume the workbook always uses the same fixed fiscal years.

The workbook's headers have spacing, newline and trailing-space variations. `lib/excel.ts` normalizes whitespace and matches headers case-insensitively.

## Identity and grouping

Identity priority:

1. GS No.
2. Project ID, Site ID or Project Code.
3. Normalized project name plus district.

Rows sharing an identity are combined: cost/allocation/release/utilization and matching annual funding are summed; overall progress is recalculated from combined utilization / approved cost. The first row supplies descriptive metadata. Verify this aggregation rule if future sheets contain repeated snapshot rows rather than split project rows.

## Validation and fallback behavior

- A missing workbook, unreadable workbook, absent project-name header, missing financial columns, or workbook with no valid project rows produces a typed `WorkbookDataError`; the UI displays a friendly source-unavailable state.
- Non-empty rows without a valid project name are skipped and counted.
- Missing numeric cell values normalize to zero. Missing overall progress falls back to utilization divided by approved cost when possible.
- Missing category/image columns get neutral presentation defaults; these defaults are not treated as financial facts.
- Absent annual funding columns yield an empty fiscal-year array, allowing chart empty states.

## Single-source rule

Do not add a per-site workbook directory, manually maintained project JSON, or browser-upload/local-storage dataset. Add source-column aliases and normalization logic in `lib/excel.ts`, and keep the `Site` model stable when changing the source provider.

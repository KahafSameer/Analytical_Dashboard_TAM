# Data model

## Normalized contract

The dashboard consumes `DashboardData`, `Site[]`, and `FiscalYear[]` from `lib/types.ts`. This contract is shared across the server Sheets adapter, client refresh provider, calculations and UI.

### `DashboardData`

| Field | Type | Meaning |
|---|---|---|
| `sites` | `Site[]` | Normalized, dynamically identified projects from the master sheet. |
| `sheetName` | `string` | Title of the first spreadsheet tab read from Google Sheets. |
| `skippedRows` | `number` | Non-empty rows that lack a supported project name. |
| `fetchedAt` | `string` | ISO timestamp when the server successfully normalized the data. |

### `Site`

| Field | Type | Meaning |
|---|---|---|
| `id` | `string` | Stable route ID from GS No, another project ID, or name/district fallback. |
| `projectId` | `string?` | Source Project ID where present. |
| `code` | `string?` | Source GS No where present. |
| `name` | `string` | Project name; required for a usable record. |
| `description` | `string` | Source description, with project name fallback. |
| `district` | `string` | Source District/Location or “Not specified”. |
| `region` | `string` | Source Province/Region or “Not specified”. |
| `category` | `string` | Source category/type or neutral “Tourism project”. |
| `image` | `string` | HTTPS image source or the existing generic presentation fallback. |
| `gestationPeriod` | `string?` | Source gestation/delivery-period text. |
| `approvedCost`, `allocated`, `released`, `utilized` | `number` | Funding totals in PKR millions. |
| `overallProgress` | `number` | Fraction from 0 to 1 from reported progress, otherwise utilization / approved cost. |
| `currentYearProgress` | `number?` | Current-year financial progress when reported. |
| `fiscalYears` | `FiscalYear[]` | Annual funding series discovered from sheet headers. |

`FiscalYear` contains `label`, `allocation`, `release`, and `utilized` values in PKR millions.

## Google Sheet columns

The sheet mirrors the former master workbook's structure; it is one spreadsheet with all projects, not one spreadsheet per project. The parser accepts headers including:

- Project identity: `Project ID`, `GS No`, and related ID aliases.
- Metadata: `Name`, `Project Name`, `Description`, `District`, `Location`, `Province`, `Region`, `Category`, `Project Type`, `Image`, and `Gestation Period`.
- Funding totals: `Total Approval Cost`, `Total Funds Allocation In Millions`, `Total FD Release In Millions`, and `Total Funds Utilization All Fys In Millions`, with supported concise aliases.
- Progress: `Project Overall Financial Progress %` and `Project CFY Financial Progress %`.
- Annual allocation, release and utilization columns with fiscal-year labels in the header.

Headers are whitespace-normalized and matched case-insensitively. The first row is the header row; subsequent rows are records. Google values are read as unformatted values so numbers and percentages remain parseable.

## Identity and duplicate rows

Identity priority is GS No, then Project ID/Site ID/Project Code, then normalized project name plus district. Duplicate project rows are grouped using the existing parser behavior: funding totals and fiscal-year values are summed and overall progress is recalculated from combined utilization / approved cost. Confirm source semantics if the sheet contains repeated snapshots rather than split project rows.

## Validation and missing values

- Missing credentials, unavailable spreadsheet, access denial, empty first tab, unsupported project-name header, missing financial headers and no valid project rows produce typed errors and user-safe messages.
- Non-empty rows without a valid name are skipped and counted.
- Missing numeric values are normalized as zero; reported progress is preferred and falls back to utilization/approved cost.
- Optional category/image fields use the existing neutral presentation defaults; no financial facts or unsupported metrics are fabricated.
- A failed refresh or invalid/empty payload does not replace valid client-held data.

## Excel migration boundary

`lib/excel.ts` retains `parseWorkbook()` for a potential offline/import adapter, but `normalizeSheetRows()` is shared with the Google Sheets source. Application routes use only `lib/google-sheets.ts`; the checked-in `.xlsx` file is no longer required at runtime.

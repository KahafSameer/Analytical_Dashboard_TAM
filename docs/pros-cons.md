# Architecture strengths and trade-offs

## Strengths

- **Single source of truth:** one master Google Sheet avoids maintaining separate per-site files or a duplicated project JSON dataset.
- **Strong UI/data boundary:** normalized TypeScript `Site` records prevent UI components from depending directly on spreadsheet headers.
- **Dynamic portfolio:** cards and detail analytics derive from normalized Google Sheets records.
- **Financial data transparency:** the dashboard avoids claiming to visualize missing activities, milestones or visitor counts.
- **Incremental analytics:** calculations are isolated in `lib/analytics.ts` and `lib/site-analytics.ts`.
- **Responsive visualizations:** Recharts provides adaptive layouts and standard interactions.

## Weaknesses

- **Best-effort cache:** server cache is process-local on Vercel; instances may each refresh independently.
- **External dependency:** serving live data depends on Google Sheets API availability, valid service-account configuration, and spreadsheet sharing.
- **Duplicate ambiguity:** summing rows with the same identity is correct only when rows represent split financial records, not repeated snapshots.
- **No central schema/versioning:** workbook columns, normalized JSON and parser expectations can drift.
- **Missing metadata:** the current workbook lacks category and image columns, so fallback display values are generic.
- **Remote visual assets:** external fonts and images can degrade or be blocked.
- **Limited testability:** automated regression tests are not currently configured.

## Trade-offs accepted for the prototype

The design favors a credible demonstration and straightforward data flow over persistent caching, write access and operational guarantees. One master Google Sheet keeps source ownership clear; the dashboard refreshes its read-only view every 30 seconds while open.

## Next architectural decision

Before adding database support, decide who owns the authoritative data, whether it is public or private, and how duplicate updates should work. Keep alternative providers behind the server repository and normalize into the same `Site` contract.

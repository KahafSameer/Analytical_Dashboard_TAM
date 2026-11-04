# UI and UX

## Design intent

Fieldnotes uses a restrained, editorial tourism identity around financial clarity: white cards, a soft gray-green canvas, dark-green navigation and highlights, photography on project cards, and compact government-style data presentation. Interaction and hierarchy are designed for a portfolio reviewer scanning many projects, rather than a generic admin panel.

## Color tokens

The central CSS variables are in `app/globals.css`.

| Use | Token / value |
|---|---|
| Primary forest green | `--green: #0F4C3A` |
| Secondary green | `--green-2: #2E7D32` |
| Heritage gold | `--gold: #D4A017` |
| Page canvas | `--canvas: #F8FAF8` |
| Main text | `--ink: #1F2937` |
| Muted text | `--muted: #64748B` |
| White cards | `--white: #FFF` |
| Borders | `--line: #E5E9E6` |
| Error/danger | `--danger: #B42318` |

Gold is reserved for selected emphasis and comparisons. Chart series also use muted green and gray-green support colors.

## Typography

The stylesheet requests DM Sans for interface text and Manrope for prominent headings and KPI values from Google Fonts. These are remote stylesheet imports, not bundled local font files. A production deployment should decide whether remote font access is acceptable or self-host the fonts.

## Interaction

- Project cards lead to `/sites/[siteId]`; hover lift and image zoom are deliberately subtle.
- Search is live, accepts a Ctrl/Cmd+K shortcut, and filters name, district, category, code and description.
- Filters expand inline on the page rather than using a bottom sheet.
- Chart hover tooltips reveal source-derived amounts and rates.
- Project and portfolio exports download CSV files.
- Entrance and hover animation respects `prefers-reduced-motion`.
- The mobile navigation is a slide-in drawer.

## Accessibility

Charts have accessible labels where practical; inputs and selects have labels; progress bars expose `role=progressbar` and values; images have category/district alt text; keyboard focus styling is visible; status badges combine text and a colored dot. Recharts tooltips are hover-oriented, so charts should not be considered a fully accessible data-table replacement.

## Data transparency

UI labels refer to financial progress and expenditure rather than construction/activity progress. Missing activity, timeline and visitor data are identified instead of represented with fabricated chart series.

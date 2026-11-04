# Responsive behavior

## Breakpoints

The responsive system is implemented in `app/globals.css` using CSS media queries:

- Above `1500px`: four portfolio card columns.
- At or below `1150px`: narrower sidebar, two card columns, adjusted charts and spacing.
- At or below `760px`: sidebar becomes a slide-in drawer, compact mobile header appears, cards and charts use mobile layouts, detail charts stack.
- At or below `480px`: portfolio cards become one column, spacing and type scale down, toolbar labels adapt, detail charts reduce height.

These are CSS breakpoints, not a promise of browser-tested behavior at every viewport.

## Desktop

Fixed sidebar with profile/workspace context. Main content has a maximum width and a multi-column project grid and analytical card layout. Large displays can use four site-card columns.

## Tablet

Sidebar is retained until the mobile breakpoint. The project grid narrows to two columns; chart layouts compress and move toward stacked views as space decreases.

## Mobile

- Sidebar is replaced with an accessible-by-button off-canvas drawer and scrim.
- Header remains compact and sticky.
- Project cards use a single column on narrow devices; intermediate mobile can retain two.
- Cards reveal as they enter the viewport and respond to tap/press; hover-only motion is restricted to devices with fine pointers.
- Progress fills and chart series animate once when visible; mobile uses no parallax.
- KPI and insight cards use two columns.
- Detail analytics stack vertically and chart containers have smaller heights.
- Fiscal-year tables are inside horizontal overflow containers, not allowed to expand the page.
- Filter controls stay inline; they are not currently presented in a native bottom sheet.

## QA targets

Check 320, 375, 390, 414, 768, 1024 and 1440+ px. Verify no viewport-level horizontal overflow, drawer dismissal, focus visibility, card control targets, chart tooltips and axis labels, and CSV toolbar layout. Also check `prefers-reduced-motion` to ensure movement is suppressed while state changes remain clear.

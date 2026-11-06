# Tourism / Heritage Analytical Dashboard — Audit Report

**Audit date:** 2026-11-05
**Project:** Fieldnotes — Tourism Intelligence
**Audit scope:** Source, configuration, current Google Sheets response, production build and local production-server behavior.
**Audit type:** Defensive, non-destructive implementation audit. No application source or configuration was changed for this audit. This report is the requested audit deliverable.

## 1. Executive summary

**Overall status: NEEDS IMPROVEMENT**
**Overall quality: 7.2/10**

The application builds and serves successfully in the audited environment. The main routes and live Sheets endpoint returned HTTP 200; the current normalized dataset contains 89 projects. A representative detail route and live assistant requests also succeeded. Environment credentials are kept out of the committed example file and generated browser JavaScript. The architecture has a clear server-side data boundary, deterministic analytics, and useful user-facing failure states.

The most important issues are that all 89 current records have the same generic project category (making the category analysis non-informative), text contrast is below WCAG AA for multiple small muted labels, CSV exports do not neutralize spreadsheet formulas, and malformed amount strings are silently converted to zero. There is no committed automated test suite. Browser-based responsive, screen-reader, and visual QA could not be performed in this environment.

| Severity | Findings |
|---|---:|
| Critical | 0 |
| High | 0 |
| Medium | 7 |
| Low | 4 |
| Info | 2 |

**Top five actions**

1. Replace or suppress the generic project-type analysis and correct its claim that categories are derived from titles.
2. Neutralize formula-leading text in both CSV export paths.
3. Improve low-contrast labels and add accessible tabular equivalents for portfolio charts.
4. Make normalization report malformed financial values rather than silently presenting them as zero, backed by repeatable tests.
5. Reduce and measure route JavaScript, then run real-device responsive and accessibility checks before broader deployment.

## 2. Scope and methodology

Reviewed the App Router structure, normalized types and calculations, Google Sheets adapter, Gemini service and route, major page and chart components, CSS breakpoints/motion, environment handling, package manifests, and available documentation. Performed safe tests against the local production build and configured dashboard data. No spreadsheet writes, destructive tests, credential inspection/output, dependency installation, or source-code fixes were performed.

Validation performed:

- `npm run lint` — **PASS**
- `npm run typecheck` — **PASS**
- `npm run build` — **PASS**
- `npm audit --omit=dev` — **0 production dependency advisories**
- `npm audit` — **10 moderate advisory entries in the development dependency tree**, attributable to a transitive `minimatch` advisory chain; see A-11.
- Local production smoke tests: `/`, `/api/dashboard-data`, a representative `/sites/[siteId]`, and a valid assistant request — **HTTP 200**.
- Assistant validation tests for empty, overlong, and malformed-history requests — **HTTP 400** with safe error messages.
- Live aggregate-only data checks: 89 records, 89 unique IDs, no non-finite or negative financial values, no progress values outside 0–1, no progress/utilization disagreement above one percentage point, no zero-progress records with positive utilization, and no annual-total discrepancy above PKR 0.02m.
- Credential-marker scan of current source/docs and generated browser JavaScript — **no matches**. `.env` is ignored and not tracked; `.env.example` contains blank placeholders.
- Checked responsive and accessibility implementation in source. No browser automation package or installed browser was available, so viewport rendering, keyboard/screen-reader behavior, and visual regression were **not** empirically verified.

The data checks describe the live response available during this audit; they do not prove that future spreadsheet edits will remain valid. Live Google Sheets and Gemini success was observed in the configured environment. Failure injection for provider outages, missing credentials, malformed Gemini responses, or Vercel execution limits was not performed.

## 3. Architecture overview

The repository is a private npm project using Next.js 16.4.4, React 19, TypeScript strict mode, App Router, Tailwind CSS v4, Recharts, Motion for React, Lucide icons, Google APIs, SheetJS, and the Google GenAI SDK.

```text
Google Spreadsheet
  → lib/google-sheets.ts (server-only auth, fetch, short cache)
  → lib/excel.ts (shared row normalization and identity grouping)
  → lib/types.ts (DashboardData / Site / FiscalYear)
  → lib/analytics.ts and lib/site-analytics.ts
  → App Router pages and React client components
  → Recharts, cards, filters and exports

Question → POST /api/assistant
  → existing normalized Sheets repository
  → lib/assistant-context.ts (selection/calculations)
  → lib/gemini.ts (server-only Gemini request)
  → answer and selected source references
```

This is a sound separation of source access, normalized data, calculations, and presentation. The dashboard has no database, user authentication, write API, or project editing workflow; those omissions are documented as prototype constraints.

## 4. Functional audit

**Working:** The overview, API, and representative dynamic detail page returned HTTP 200 in the local production server. The overview loads 89 normalized records. Search, filters, sort options, detail navigation, charts, CSV controls, loading/empty/error states, and mobile navigation are present in code. The details page uses the selected normalized record and presents annual funding with both a chart and table. Milestones, activity progress, completion status, visitor metrics, and dated trends are not implemented because they are absent from the model; the UI states this limitation instead of fabricating them.

The assistant’s current production endpoint returned a response for an English portfolio question and the two sample Roman Urdu-style questions used in this audit. The request validator rejected empty, overlong, and malformed-history payloads with HTTP 400. This verifies a basic live path but is not a full conversation, language-coverage, or provider-failure test.

**Partially verified:** UI interactions and all requested screen widths were inspected from source/CSS only. No browser was available to click every filter, test downloads, inspect layout overflow, or check mobile keyboard behavior.

**Project vocabulary:** The card/detail “Spend recorded” and “No spend yet” badges are based on utilization, not actual delivery status. The detail page does not claim that they mean project completion. This is appropriately more precise than a project-status label.

## 5. Data integrity audit

`lib/excel.ts` maps supported project, location, category, progress, funding, and fiscal-year fields into the same `Site` type used by analytics and UI. Current live records were internally well-formed under the checks described above. IDs were unique, and annual funding totals reconciled to their row-level totals within the selected tolerance.

Important caveats:

- `readAmount()` treats empty, non-numeric, and malformed values as `0` (A-02). That can make invalid input look like legitimate zero funding.
- `readProgress()` clamps values into the 0–1 range and falls back to utilization/approved cost only when the reported value cannot be parsed. It does not expose a warning when a reported number is clamped.
- Duplicate identities are merged by summing totals and annual values. The current live response had no duplicate IDs, but the code cannot distinguish split rows from repeated snapshots (A-08).
- Portfolio weighted progress is calculated from total utilization / total approval cost, while individual progress prefers the source-reported percentage. The current data showed no material disagreement, but future source disagreements can make portfolio and site progress differ.
- “No expenditure” progress-band membership is based on `overallProgress === 0`, while the card’s spend status is based on `utilized === 0`. The current response had no zero-progress/positive-spend records; inconsistent future source values could make these labels disagree.
- The normalizer reads the first spreadsheet tab and a fixed `A:ZZ` range. A reordered tab or a source schema extending past column ZZ can change or truncate the data read. The first-tab contract is documented but not enforced against an expected worksheet name.

## 6. Google Sheets integration audit

The Google client is isolated in `lib/google-sheets.ts`, imports `server-only`, uses a read-only Sheets scope, validates required variables, escapes the sheet title, requests unformatted values, and maps provider failures into safe typed errors. Metadata and value calls each have a 12-second timeout. Concurrent calls in one warm process share an in-flight promise; successful data is cached for 20 seconds. The client polls `/api/dashboard-data` every 30 seconds while visible, allows one client request at a time, and retains its last successful data on refresh errors.

The live endpoint returned 89 projects and a fetch timestamp; no current numeric or annual-total anomaly was detected. No credentials were returned by the endpoint or found in current browser bundles. The endpoint returns the complete normalized project list and is not authenticated, so its contents must be approved for public access (A-12).

**Reliability limits:** the server cache is process-local, not shared across Vercel instances. Once its TTL expires, an upstream failure is returned rather than serving the expired cached value. A browser that already has data keeps it, but a new page load during an outage can receive no data. Client and server timeout budgets also do not align in worst-case provider latency (A-09, A-10).

## 7. AI chatbot / Gemini audit

`lib/gemini.ts` is server-only and reads `GEMINI_API_KEY` from the server environment. A browser-side key scan found no Gemini or Google private-key markers. `POST /api/assistant` validates JSON, message length, history shape/size, and request-body bytes. It bounds history to six entries, limits output, applies a 12-request process-local rate counter, uses no-store responses, and returns generic provider errors rather than stack traces.

`prepareAssistantContext()` performs filtering and common calculations locally, then sends a compact context rather than raw sheet rows or the full portfolio. The English-to-lookup interpretation fallback sends the question and bounded recent history for interpretation; calculation and selection still use the normalized TypeScript dataset. The answer instruction limits the assistant to the supplied context and identifies unavailable fields. UI message formatting renders React text nodes and a small Markdown subset, not raw HTML.

**Observed behavior:** a valid English request returned HTTP 200; the sampled Roman Urdu-style requests returned HTTP 200. One topic query returned no source references, consistent with the lack of matching project-name/category data; current categories are all generic, so topic lookup is necessarily limited. A model response’s existence does not establish accuracy for every language or prompt. Gemini failure, missing-key, malformed-model-output, and full multi-turn follow-up cases were not fault-injected in this audit.

**Risks and boundaries:** each request can invoke Gemini; an unrecognized-language question can invoke it twice (interpretation and answer). The limiter is per process and is not a shared production quota (A-13). The chat client aborts after 30 seconds, while the two Gemini calls alone allow 12 and 20 seconds and the two sequential Sheets calls allow another 12 seconds each. Under slow upstream conditions, the browser can abandon work before the route finishes (A-09). The project does not publish an exact supported-language count or guarantee consistent language quality.

## 8. UI/UX audit

The visual system is cohesive: dark forest green, restrained gold, muted green/gray surfaces, white cards, consistent spacing, compact labels, editorial project cards, and consistent chart shells. The site overview is purpose-built around funding, project identity, and reporting areas rather than a generic admin template. The interface makes financial progress distinct from construction progress and includes useful stale-data, empty, loading, and source notes.

The main data-communication issue is the “Portfolio by project type” chart. `summarizeCategories()` aggregates `site.category`, but the chart says it is grouped by project title and “classified from project titles.” In the live response, all 89 records had the same fallback category and there was only one distinct image across the portfolio. Thus the current category donut is a single generic group rather than a meaningful category comparison, and project cards do not have distinct imagery (A-01).

The sidebar profile/settings control opens a prototype-information popover, not a settings page. This is acceptable for a prototype but should remain clearly identified as informational. `app/layout.tsx` provides a title and description; Open Graph/social metadata and app icons are not present. SEO enhancements are optional for an internal dashboard, not a release blocker.

## 9. Responsive audit

CSS defines breakpoints at 1500px, 1150px, 760px, 480px, and 360px. It switches the sidebar to a drawer, reduces the site grid to one column on narrow screens, stacks charts/details, keeps KPIs in two columns, and wraps the fiscal-year table in horizontal scrolling. The assistant uses a mobile bottom-sheet layout and viewport-aware height. These rules are coherent by inspection.

**Not confirmed in a browser:** no actual rendering was tested at 320, 375, 390, 414, 768, 1024, 1280, or 1440+ px. Horizontal overflow, chart axis collisions, keyboard/viewport interaction, touch target quality, and drawer focus behavior remain unverified. Do not describe the application as device-tested based on this audit.

## 10. Animation audit

Motion for React handles card/reveal transitions, chart entrance, progress fills, and the assistant panel. Hover effects are restricted to fine pointers. Both `MotionConfig` and CSS respond to `prefers-reduced-motion`; the assistant’s typing spinner also stops under the preference. The main animations use opacity/transform or a progress width transition, and no continuous chart animation loop was found.

No measured frame-rate, CPU, layout-shift, or low-end-device performance test was run. The card grid mounts a motion wrapper per result and has no pagination/virtualization; this is acceptable for the current 89 records but should be revisited if the portfolio grows substantially.

## 11. Performance audit

Measured from the local production HTML, the overview references nine JavaScript chunks totaling **1,244,845 bytes uncompressed**; the detail route references **1,238,379 bytes uncompressed**. Compression and real-device download/parse times were not measured. The main page imports chart and motion components in client modules; this is the clearest measurable optimization opportunity (A-07).

The normalized dashboard API returned **75,321 bytes** for the current 89 records in the local production test. The browser polls every 30 seconds while visible and sends the full normalized dataset, not a delta. At the current size this is modest, but the no-store endpoint and per-instance cache can result in repeated full reads and payloads as users/instances scale.

Images use `next/image`, lazy loading for cards, responsive `sizes`, and eager loading for the first card/detail hero. The Google Fonts stylesheet is loaded through CSS `@import`, which adds an external render dependency and should be measured or self-hosted for production. No Core Web Vitals, Lighthouse, compressed transfer, or Vercel latency numbers are claimed.

## 12. Security audit

**Positive controls verified:** local `.env` is ignored and untracked; `.env.example` has blank values; current source/docs and generated browser JavaScript contained no credential markers. Sheets and Gemini modules are server-only. Google scope is read-only. API input is bounded. Errors are user-safe. Chat output is rendered as text/limited React Markdown; no unsafe HTML sink was found.

**Confirmed export hardening gap:** neither CSV export neutralizes spreadsheet formula prefixes (A-03). This is a potential formula-injection path if a sheet value controlled by an untrusted editor is exported and opened in a spreadsheet application. Quoting and doubling quotes do not neutralize formulas.

**Deployment boundary, not a vulnerability finding:** the dashboard has no login or authorization by design. `/api/dashboard-data` exposes the full normalized dataset to any caller, and the assistant can incur Gemini usage. Do not deploy confidential project or financial data as a public prototype. No explicit custom CSP, frame, content-type, or other security-header policy is configured in `next.config.ts`; this is a hardening recommendation, not evidence of an exploitable vulnerability. CORS is not broadly enabled by application code.

## 13. Dependency audit

`npm audit --omit=dev` reported zero production advisories. The full audit reported ten moderate advisory entries in development dependencies, all related through the ESLint/TypeScript linting dependency graph to `minimatch` advisory **GHSA-g3hv-75wg-m249** (potential denial of service through glob-part amplification). These tools are not part of the production runtime. Review a compatible patched lint-toolchain update rather than applying the suggested major-version changes without validation (A-11).

The project uses npm with `package-lock.json`; Next.js 16.4.4, React 19, TypeScript 5.8, Recharts, Motion, Google APIs, `@google/genai`, and SheetJS are declared. No dependency changes were made. A registry audit does not replace checking advisories for the exact deployed runtime or transitive package provenance.

## 14. Code quality and architecture audit

The domain model is explicit and TypeScript strict mode is enabled. Provider integration is separated from client analytics; components receive normalized data and the assistant reuses the same repository. The lint, type-check, and build pass. No broad `any` escape was found in the reviewed core paths.

Maintainability gaps are the absence of a test runner/test script and the concentration of question intent, deterministic filtering, and source construction in one large assistant-context module. The latter is not currently a build defect, but focused unit tests and smaller query-domain helpers would make future changes safer. Data normalization should return validation diagnostics for malformed values rather than making error states indistinguishable from valid zeros.

## 15. Accessibility audit

**Positive controls:** semantic headings/sections, accessible names for key search and chart controls, visible keyboard focus rules, progressbar semantics, descriptive image alt text, keyboard Escape handling and focus return in the assistant, a bounded Tab trap for its dialog, and reduced-motion support are present.

**Confirmed gaps:** several small muted labels use colors below the WCAG AA 4.5:1 contrast threshold for normal text. Measured against white: `#89938c` is **3.17:1**, `#78847c` is **3.90:1**, and `#a0aaa2` is **2.40:1**; these appear in small supporting text, results metadata, and codes (A-04). In addition, portfolio charts are exposed as a single `role="img"` with a summary label and hover-only values. There is no equivalent accessible data table for the district, progress-band, or category charts (A-05). This is not a formal WCAG conformance test.

## 16. SEO / metadata audit

`app/layout.tsx` sets a page title and description, and page structure uses headings and semantic sections. This is sufficient baseline metadata for an internal dashboard. Open Graph metadata, icons, sitemap, and robots configuration are absent. They are optional if the app remains internal; if public marketing/discoverability is intended, add the relevant metadata. If the deployment should be private, `noindex` is not access control and must not substitute for authentication.

## 17. Error handling and reliability audit

Sheets configuration/auth/permission/empty/schema errors are converted into safe messages. The dashboard displays an error/retry state when it has no data; refresh failures preserve the last valid client payload and show a freshness warning. The assistant validates request shape and translates provider errors to safe responses. A representative successful Sheets read and live assistant request were confirmed.

No outage injection was performed. The client can keep showing stale data indefinitely while repeated refreshes fail, although it displays a warning; the server does not serve expired cache after a failed upstream fetch. There is no operational logging/monitoring in the reviewed application path to quantify freshness or diagnose outages without exposing provider details. See A-10.

## 18. Deployment / Vercel compatibility

**Local production build: PASS.** `npm run build` completed and produced dynamic App Router routes for `/`, `/sites/[siteId]`, `/api/dashboard-data`, and `/api/assistant`. `npm run start` served the overview, data endpoint, representative detail route, and assistant validation requests successfully. Node.js v24.16.0 and npm 11.13.0 were used.

No `vercel.json` or custom output directory is present; standard Next.js deployment defaults are used. The assistant explicitly uses the Node.js runtime, appropriate for the Google SDKs. **Actual Vercel deployment was not tested.** Environment-variable configuration, Vercel plan/function duration, and real deployment traffic remain outside this local verification. Timeout budget A-09 should be checked against the selected Vercel plan.

## 19. Testing audit

There is no committed unit, integration, browser, or visual test suite and no `test` script in `package.json`. `docs/testing.md` is a useful manual checklist, not executable coverage. Lint, typecheck, and build all pass. Safe runtime smoke checks cover successful reads, a representative route, assistant success, and request validation. Important untested areas include parser edge cases, duplicate semantics, aggregate reconciliation, all filter combinations, CSV content/formula handling, mobile layout, accessibility, provider outages, Gemini malformed/error responses, and follow-up history (A-06).

## 20. Documentation audit

The `docs/` directory documents architecture, fields, Sheets, deployment, security, performance, routes, UI, and manual QA. Most core architecture and data-source statements match the reviewed code. The previous `docs/audit-report.md` was an implementation-gap summary rather than a full audit and is replaced by this evidence-based report.

The analytics component’s current text says the project-type chart is grouped/classified by project title, while the implementation groups by normalized `category` and all live records use the generic fallback. That is a confirmed product/documentation mismatch (A-01). Documentation correctly notes that authentication, physical progress, status, milestones, and historical trends are absent.

## 21. Scorecard

| Area | Score | Status |
|---|---:|---|
| Functionality | 8/10 | Main data routes and key assistant paths pass; broad UI interaction coverage is manual |
| Data Integrity | 7/10 | Current response is internally clean; parser and duplicate edge cases need validation |
| UI/UX | 7.5/10 | Polished visual system; category insight and imagery are generic |
| Responsive | 7.5/10 | Intentional breakpoints in CSS; not browser/device verified |
| Accessibility | 5.5/10 | Good baseline semantics/motion support; contrast and chart alternatives need work |
| Performance | 6.5/10 | 1.24 MB uncompressed initial JS observed; current data payload remains moderate |
| Security | 7/10 | Credentials protected, but CSV export and public-data boundaries need attention |
| Architecture | 8/10 | Strong source/normalization/analytics/UI separation |
| Code Quality | 7.5/10 | Strict TypeScript and passing checks; no automated regression suite |
| AI Assistant | 7/10 | Live endpoint works and is data-grounded; language and topic coverage remain bounded |
| Documentation | 7/10 | Broad coverage; chart semantics need correction |
| Deployment | 8/10 | Local production build/runtime pass; Vercel deployment not tested |
| **Overall Score** | **7.2/10** | **Needs improvement before use with non-public data** |

## 22. Findings

### A-01 — Generic category data makes project-type analysis misleading

**Severity:** MEDIUM
**Category:** Data / UI / Documentation
**Status:** Confirmed
**Evidence:** `lib/excel.ts:135-142` defaults absent category values to `"Tourism project"`; `lib/analytics.ts:55-68` groups by `site.category`; `components/portfolio-analytics.tsx:106-132` describes categories as grouped/classified by project title. In the live 89-record response, there was only **one distinct category**, and all 89 records had the generic category. The live response also had only one distinct image URL across the portfolio.
**Impact:** The category donut and “largest investment category” signal communicate no real category distinction, while copy implies classification by title. Uniform imagery weakens site identification.
**Recommendation:** Use a verified source category field, or suppress the category chart/signal when all records use the fallback. Correct the chart copy. Provide approved site-specific images if available; do not infer categories from names without an explicit, reviewed mapping.
**Priority:** P1

### A-02 — Invalid financial strings silently become zero

**Severity:** MEDIUM
**Category:** Data Integrity
**Status:** Potential
**Evidence:** `lib/excel.ts:60-67` returns `0` for non-numeric values; `lib/excel.ts:69-79` clamps progress and falls back to a derived ratio. The normalizer returns records without reporting malformed numeric cells.
**Impact:** A currency-formatted or otherwise malformed text cell can be displayed and aggregated as a legitimate zero without a warning. Current live values passed numeric integrity checks; this is an edge-case risk, not an observed current anomaly.
**Recommendation:** Return normalization diagnostics for invalid non-empty numeric fields, distinguish missing from malformed values, and surface skipped/invalid-cell counts or fail validation when required financial fields are invalid.
**Priority:** P1

### A-03 — CSV exports do not neutralize spreadsheet formulas

**Severity:** MEDIUM
**Category:** Security
**Status:** Potential
**Evidence:** `components/portfolio-export-button.tsx:25` and `components/site-detail.tsx:36-59` quote and escape CSV strings but do not neutralize values beginning with formula characters such as `=`, `+`, `-`, or `@`. Project names, codes, districts, and categories originate from the spreadsheet.
**Impact:** If an editor-controlled cell contains a formula payload, a user opening the exported CSV in a spreadsheet application may evaluate it. No malicious source value was tested or observed.
**Recommendation:** Sanitize untrusted text fields for spreadsheet-safe CSV export (including leading whitespace/control characters before formula detection) and document the export behavior. Keep numeric columns numeric.
**Priority:** P1

### A-04 — Muted small text misses WCAG AA contrast

**Severity:** MEDIUM
**Category:** Accessibility / UI
**Status:** Confirmed
**Evidence:** `app/globals.css:58,96,129,143` uses small text colors including `#a0aaa2` and `#89938c`; additional muted text uses `#78847c`. Contrast against white was calculated at 2.40:1, 3.17:1, and 3.90:1 respectively, below the 4.5:1 normal-text threshold.
**Impact:** Supporting labels, codes, and result metadata can be difficult to read for low-vision users and fail the contrast criterion at those uses.
**Recommendation:** Darken small text tokens and validate foreground/background pairs, including tinted cards, at their actual rendered backgrounds.
**Priority:** P1

### A-05 — Portfolio charts lack accessible data equivalents

**Severity:** MEDIUM
**Category:** Accessibility
**Status:** Confirmed
**Evidence:** `components/portfolio-analytics.tsx:78-80,110-112,144-146` marks charts as `role="img"` with summary labels. Individual values are exposed mainly through Recharts hover tooltips. Portfolio district and progress charts have no adjacent data table.
**Impact:** Screen-reader users receive a chart summary but cannot reliably explore its underlying values; keyboard users cannot access hover-only points.
**Recommendation:** Add compact, accessible tables or lists for plotted values and ensure chart labels/values have a keyboard-accessible path.
**Priority:** P1

### A-06 — No repeatable automated regression tests

**Severity:** MEDIUM
**Category:** QA / Maintainability
**Status:** Confirmed
**Evidence:** `package.json` defines `dev`, `build`, `start`, `lint`, and `typecheck`, but no test script. No unit, API, or browser test suite was found. `docs/testing.md` contains a manual checklist.
**Impact:** Data normalization, totals, assistant query interpretation, and export behavior can regress without detection despite successful lint/build checks.
**Recommendation:** Add focused tests for normalization (invalid/missing/duplicate values), analytics reconciliation, query filters/ranges, request validation, and CSV safety. Add browser coverage for the most important navigation and mobile controls when a browser-test environment is available.
**Priority:** P1

### A-07 — Initial route JavaScript is large for the dashboard

**Severity:** MEDIUM
**Category:** Performance
**Status:** Confirmed
**Evidence:** Production HTML for `/` referenced nine JavaScript chunks totaling 1,244,845 bytes uncompressed; `/sites/[siteId]` referenced 1,238,379 bytes. `components/sites-overview.tsx`, `components/portfolio-chart.tsx`, `components/portfolio-analytics.tsx`, and motion-enabled client components are part of the route’s client surface. Compressed transfer and device parse times were not measured.
**Impact:** A large client payload can delay interaction on mobile or slower networks, especially when most analysis is below the fold.
**Recommendation:** Capture a route bundle report, then consider splitting/lazy-loading below-the-fold analytics and chart modules. Measure compressed transfer and Core Web Vitals before and after changes.
**Priority:** P2

### A-08 — Duplicate identity merging assumes additive rows

**Severity:** LOW
**Category:** Data / Reliability
**Status:** Potential
**Evidence:** `lib/excel.ts:154-174,197-201` sums funding fields and annual values whenever rows share a stable identifier. The live dataset had 89 unique IDs and no duplicates.
**Impact:** If the source later contains repeated snapshots rather than split records, duplicate amounts will be counted twice and progress recalculated from those totals.
**Recommendation:** Confirm the spreadsheet’s row semantics with its owner; reject or flag repeated identifiers unless they are explicitly additive. Add tests for both split-row and repeated-snapshot cases.
**Priority:** P2

### A-09 — Client/server timeout budgets can conflict

**Severity:** LOW
**Category:** Reliability / Performance
**Status:** Potential
**Evidence:** `lib/google-sheets.ts:58-72` performs two sequential calls with 12-second timeouts; `components/dashboard-data-provider.tsx:42` aborts refresh after 15 seconds. The assistant route can make two sequential Gemini calls with 12- and 20-second timeouts (`lib/gemini.ts:29,63`), while `components/assistant/assistant-widget.tsx:88` aborts at 30 seconds.
**Impact:** Slow providers can exceed the browser deadline even though the server-side operation is still within its own configured timeouts. Cold Sheets fetch plus language interpretation can extend beyond the client deadline; Vercel function limits are plan/configuration dependent.
**Recommendation:** Define an end-to-end deadline budget, reserve time for serialization/response, and align provider, route, client, and Vercel function limits.
**Priority:** P2

### A-10 — Stale-data behavior differs between an open dashboard and a new load

**Severity:** LOW
**Category:** Reliability / Data Freshness
**Status:** Potential
**Evidence:** `components/dashboard-data-provider.tsx:49-64` retains prior client data after refresh errors and retries every 30 seconds without a maximum stale age. In `lib/google-sheets.ts:92-106`, an expired in-memory cache is not returned if the new fetch fails.
**Impact:** An open dashboard can continue showing stale financial data indefinitely (with a warning), while a new page load during an outage can fail despite an expired server cache containing prior data.
**Recommendation:** Show the age of last successful data prominently, define a maximum acceptable stale window, and consider serving a clearly marked stale server value when policy permits.
**Priority:** P2

### A-11 — Moderate development-tool advisory chain

**Severity:** LOW
**Category:** Dependencies / Security
**Status:** Confirmed
**Evidence:** `npm audit` reported ten moderate package entries in the development toolchain, including `minimatch` advisory GHSA-g3hv-75wg-m249. `npm audit --omit=dev` reported zero production advisories.
**Impact:** The affected path is associated with development/lint tooling rather than shipped application runtime, so production risk is limited; crafted lint inputs could affect developer/CI tooling.
**Recommendation:** Review a compatible patched ESLint/TypeScript lint stack and validate it with lint/build. Do not apply a major-version downgrade or broad dependency update without review.
**Priority:** P2

### A-12 — Public data exposure is an intentional deployment boundary

**Severity:** INFO
**Category:** Security / Deployment
**Status:** Recommendation
**Evidence:** `app/api/dashboard-data/route.ts:8-22` serves the normalized dataset without authentication. The route contains no viewer authorization. Documentation explicitly says the prototype is publicly readable.
**Impact:** Any reachable visitor can retrieve all normalized project financial records; `no-store` affects caching, not access control. This is expected for the current prototype, not a confirmed vulnerability under its stated design.
**Recommendation:** Publish only data approved for unrestricted access. If the dataset is private, add identity and authorization controls before deployment; `robots.txt` or obscurity is not a substitute.
**Priority:** P1 before use with non-public data

### A-13 — Assistant rate limiting is process-local

**Severity:** INFO
**Category:** Security / Reliability
**Status:** Recommendation
**Evidence:** `app/api/assistant/route.ts:26,90-116` stores request counts in an in-memory `Map` keyed by forwarded-IP headers.
**Impact:** Counts are not shared across serverless instances and reset when an instance is recycled. This is a basic abuse guard, not a guaranteed global Gemini quota; spoofable fallback headers are also not a suitable trust boundary outside the expected Vercel proxy.
**Recommendation:** For public/high-volume deployment, enforce provider budgets and distributed rate limiting at a trusted gateway or shared store, and trust only proxy-provided client-IP headers.
**Priority:** P2

## 23. Risk summary

| Risk | Severity | Impact | Recommended action |
|---|---|---|---|
| Generic category/image coverage makes project-type analysis non-informative | MEDIUM | Misleading or low-value portfolio insight | Use verified categories/images or suppress fallback-based analysis |
| Formula-leading source text in CSV exports | MEDIUM | Spreadsheet formula evaluation when an export is opened | Neutralize formula prefixes in exported text fields |
| Muted text contrast and chart-only values | MEDIUM | Excludes some low-vision and non-visual users | Improve contrast and provide accessible tables |
| Invalid numeric cells presented as zero | MEDIUM | Financial values and aggregates can be silently understated | Validate and surface malformed-cell diagnostics |
| No automated regression tests | MEDIUM | Data, assistant, and export regressions may go unnoticed | Add parser, analytics, route, and export tests |
| Large initial JavaScript | MEDIUM | Slower mobile load and interaction | Analyze and split chart/motion bundles |
| Public endpoint returns the full normalized dataset | INFO | Exposure if non-public data is deployed | Treat the dataset as public or add authentication |
| Process-local assistant quota | INFO | Gemini usage can exceed the intended per-process limit at scale | Add shared limits and provider budgets |

## 24. What is working well

- Clear server-only boundary for Google Sheets and Gemini credentials; no credential markers in generated browser JS.
- One normalized dashboard dataset is reused across overview, detail pages, analytics, and assistant context.
- Strict TypeScript, lint, type-check, and production build all pass.
- The live 89-record response had unique IDs, finite/non-negative financial values, valid progress ranges, and reconciled annual totals under the tested tolerance.
- Google API values are requested in unformatted form, the tab name is escaped, credentials are read-only, and requests have explicit timeouts.
- Loading, empty, retry, stale-data, missing-project, and provider error states exist.
- Assistant input and history are bounded; deterministic filters/rankings are performed locally; assistant output does not use raw HTML.
- The UI uses a coherent green/heritage palette, has clear financial-vs-physical progress disclaimers, and supports reduced motion.
- Standard Next.js production build and local production routes work; no custom Vercel output configuration is required.

## 25. Recommended roadmap

### Immediate — P0

No critical or high-severity issue was confirmed during this audit.

### Short term — P1

- Correct or remove the current generic category chart and its title-derived classification copy.
- Make both CSV exports safe against formula injection from source text.
- Raise contrast for small muted labels and give portfolio charts accessible data tables.
- Add normalization diagnostics for malformed financial values and regression tests around parsing and totals.
- Before sharing with non-public data, add authentication/authorization or formally approve the public data boundary.

### Medium term — P2

- Analyze route chunks and lazy-load below-the-fold chart modules where useful.
- Document and validate duplicate-row semantics; test additive rows and repeated snapshots.
- Align Google/Gemini, browser, and deployment execution deadlines.
- Define maximum stale-data age and a cold-load outage strategy.
- Resolve the dev-only `minimatch` advisory chain and use shared rate limiting/provider budgets for public traffic.
- Perform browser-based checks at 320, 375, 390, 414, 768, 1024, 1280, and 1440+ px, plus keyboard and screen-reader testing.

### Long term — P3

- Add approved site-specific photography and verified category metadata to the source.
- Measure Core Web Vitals and compressed transfer on representative mobile devices.
- Add observability for data freshness, Sheets/API failure categories, and assistant latency without logging secrets or unnecessary user content.
- Add Open Graph metadata/icons only if the product is intended to be publicly discoverable.

## 26. Final conclusion

This is a well-structured, visually considered prototype with a functioning Google Sheets data path, working production build, and server-side Gemini integration. Current live data passed the tested numeric and identity checks. It is not yet a production-ready public financial reporting tool: category/imagery data is generic, export safety and accessibility need improvement, malformed values can be hidden as zeros, and automated regression coverage is absent. Responsive behavior is thoughtfully implemented in CSS but was not verified in a real browser during this audit.

## Final Verdict

**Overall Status:** NEEDS IMPROVEMENT
**Overall Score:** 7.2/10
**Critical Findings:** 0
**High Findings:** 0
**Medium Findings:** 7
**Low Findings:** 4
**Informational Findings:** 2

**Top 5 Actions**

1. Replace or suppress generic category analytics and correct the chart’s data description.
2. Sanitize spreadsheet-originated text in both CSV exports.
3. Fix small-text contrast and add accessible chart data alternatives.
4. Add numeric validation diagnostics and focused automated regression tests.
5. Reduce initial client JavaScript and complete browser-based responsive/accessibility QA.

**`npm run build`: PASS** — Next.js production build completed successfully on 2026-11-05.

## Remediation follow-up — 2026-11-05

The findings and score above describe the original audit baseline. The following changes were made afterward; this follow-up does not replace the original audit result:

| Finding | Follow-up status |
|---|---|
| A-01 — Generic category analysis | **Addressed in the analytics UI:** generic/fallback categories are excluded from category summaries, the normalizer labels absent categories as “Unclassified,” and chart copy now reflects source-provided types. The source still lacks category and image diversity; distinct project photography remains unaddressed. |
| A-02 — Malformed amounts silently treated as zero | **Addressed:** normalization counts malformed financial cells and the overview/detail pages disclose the count. Blank cells remain valid zero values. |
| A-03 — CSV formula prefixes | **Addressed:** both exports use a shared serializer that prefixes formula-leading text, including text preceded by whitespace. |
| A-04 — Muted text contrast | **Addressed in the reviewed styles:** muted text now uses `#59665d`, measured at 6.03:1 on white and 5.75:1 on `#f8faf8`; chart tick labels and form placeholders were updated as well. This is not a formal WCAG conformance claim. |
| A-05 — Chart data alternatives | **Addressed for portfolio charts:** funding, district, category, and progress charts now provide expandable semantic data tables. |
| A-06 — Automated regression tests | **Addressed for these fixes:** added parser diagnostics, category filtering, and CSV serialization regression tests. |
| A-07 — Initial route JavaScript | **Improved:** below-the-fold portfolio and site-detail charts are loaded near the viewport. The overview references 807,714 bytes across 11 JavaScript files, versus 1,244,845 bytes across nine at baseline; the detail route references 802,210 bytes across 11, versus 1,238,379 bytes across nine. These are uncompressed local HTML-linked script sizes, about a 35% reduction on each route; transfer and parse time were not measured. |

`npm run test`, `npm run lint`, `npm run typecheck`, and `npm run build` pass after these changes. Production smoke checks returned HTTP 200 for `/`, `/api/dashboard-data`, and a representative `/sites/[siteId]`; the current source response still contains 89 projects and reports zero malformed financial values. Real-browser responsive, keyboard, and screen-reader testing remains outstanding.

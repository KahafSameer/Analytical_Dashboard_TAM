# Security

## Current data and credential boundaries

- No authentication, account system, database, Google credentials, server API or application secrets are currently configured.
- The master workbook is read from the project root on the server. It is included with the project deployment; treat all financial records as public only if their owner has approved that distribution.
- The workbook is not accepted from users and is not stored in browser local storage.
- Google Sheets integration is not implemented. Do not add a private spreadsheet credential to a browser bundle or a `NEXT_PUBLIC_*` variable.

## Workbook processing

The parser reads the configured master workbook and inspects its first worksheet. There is no upload route. The workbook remains an input that must be reviewed and validated before deployment; parser-level structural validation is not a comprehensive malformed-file or resource-exhaustion defense. Do not execute macros or treat workbook strings as trusted HTML.

If user uploads are added later, define authorized access, size limits, content checks, parsing resource limits, malware handling, retention and audit logging.

## Dependencies and operations

SheetJS is pinned to the patched 0.20.3 tarball from `cdn.sheetjs.com`; the dependency's source/tarball origin is a supply-chain consideration and should be pinned/reviewed via lockfile and CI. The production-only `npm audit --omit=dev` check passed during implementation; repeat it with dependency updates. Do not infer that a prototype audit constitutes a security review or eliminates all runtime risk.

Protect production with HTTPS and suitable security headers. Review remote image/font privacy implications and the privacy policy before public launch. No security headers, CSP, telemetry policy or formal vulnerability disclosure process are currently documented in application code.

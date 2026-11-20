# Fieldnotes: Punjab Tourism Insights Dashboard

A tourism and heritage **project-finance dashboard** for reviewing tourism investment projects in Punjab, Pakistan, built with Next.js. A master **Google Spreadsheet** is the single source of truth: a server-side Sheets adapter normalizes its rows into a typed dataset that powers the portfolio cards, filters, project detail pages, financial analytics and an **AI assistant**.

> This is an analytics prototype, not an official financial system or source of record. Sheets access is read-only.

## Features

- Portfolio overview with filters and financial analytics (charts via Recharts)
- Project detail pages (`/sites/[siteId]`)
- Background data refresh every 30 seconds while the tab is visible, with a stale-data warning if a refresh fails
- CSV / Excel export of project and portfolio data
- AI assistant (`/api/assistant`): Gemini by default, with optional Groq (web search and backup model) and NVIDIA fallbacks
- Open Graph share images

## Tech Stack

Next.js 16 (App Router) · React · TypeScript · Tailwind CSS · Recharts · Motion · `googleapis` (Sheets API) · `@google/genai` · `xlsx` · Lucide icons

## Prerequisites

- Node.js and npm
- A Google Cloud **service account** with read access to the master spreadsheet (see [docs/google-sheets.md](docs/google-sheets.md))
- A Gemini API key for the assistant

## Installation & Setup

```bash
git clone https://github.com/KahafSameer/Analytical_Dashboard_TAM.git
cd Analytical_Dashboard_TAM
npm install
cp .env.example .env.local      # then fill in the values
npm run dev                     # http://localhost:3000
```

## Environment Variables

From [.env.example](.env.example):

| Variable | Required | Purpose |
|---|---|---|
| `GOOGLE_SHEET_ID` | ✅ | ID of the master spreadsheet |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | ✅ | Service account email |
| `GOOGLE_PRIVATE_KEY` | ✅ | Service account private key |
| `GEMINI_API_KEY` | ✅ | AI assistant (Gemini) |
| `GROQ_API_KEY` | Optional | Live web search and backup model for the assistant |
| `NEXT_PUBLIC_SITE_URL` | Optional | Public URL for share-link previews (the Vercel domain is used when unset) |
| `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `GEMINI_PLANNER_MODEL`, `ASSISTANT_GOOGLE_GROUNDING`, `GROQ_MODEL`, `GROQ_FALLBACK_MODEL`, `GROQ_SEARCH_MODEL`, `NVIDIA_API_KEY`, `NVIDIA_MODEL`, `ASSISTANT_CONTACT` | Optional | Assistant tuning (see [docs/assistant.md](docs/assistant.md)) |

## Usage

| Command | Description |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm test` | Run tests in `tests/` (`tsx --test`) |

## Routes

| Path | Description |
|---|---|
| `/` | Portfolio dashboard |
| `/sites/[siteId]` | Project detail |
| `/api/dashboard-data` | Normalized dataset (server-side Sheets fetch) |
| `/api/assistant` | AI assistant endpoint |

## Project Structure

```
app/          # App Router pages and API routes
components/   # Dashboard, charts, assistant UI
lib/          # Sheets adapter, data schema, analytics, CSV/Excel, Gemini and assistant logic
tests/        # Node test runner tests
docs/         # Full project documentation
```

## Documentation

The full docs are in [docs/](docs/README.md): [overview](docs/overview.md), [architecture](docs/architecture.md), [data model](docs/data-model.md), [analytics](docs/analytics.md), [assistant](docs/assistant.md), [Google Sheets setup](docs/google-sheets.md), [deployment](docs/deployment.md) and more.

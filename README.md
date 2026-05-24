# Atlas Insights

> Nx monorepo containing a **React + TypeScript dashboard** (`apps/web`) and a **NestJS caching & security API** (`apps/api`) that together visualize USGS earthquake data with end-to-end type safety.

![Atlas Insights screenshot placeholder](./docs/screenshot-dashboard.png)

---

## ✨ Highlights

- **Nx monorepo** with two apps (`web`, `api`) and two shared libs (`shared-types`, `shared-utils`) — strict project boundaries, end-to-end TypeScript paths, single dependency graph.
- **NestJS API layer** in front of the public USGS feed: in-memory cache with TTL and stampede prevention, `@nestjs/throttler` rate limiting, `helmet` security headers, `class-validator` DTOs, untrusted-input sanitization, sanitized error envelope, structured access logs.
- **React dashboard** with bidirectional chart ↔ table sync, a toggleable scatter / world-map view (Recharts + Leaflet), three deliberately-placed state patterns (props / Context / Zustand), virtualized table (TanStack Virtual), polished Tailwind UI.
- **Single source of truth for the wire format** — `EarthquakeRecord` lives in `libs/shared-types` and is imported by both ends.
- **CSV parser shared across the wire** — the API parses upstream, the FE can fall back to direct USGS fetch in "demo mode" without diverging from the API's interpretation.
- Production-grade developer experience: TypeScript strict mode (with `noUncheckedIndexedAccess`), ESLint zero-warning policy, Prettier, env validation, graceful shutdown.

See [`SECURITY.md`](./SECURITY.md) for the full threat model and the controls actually in place.

---

## 🏗 Workspace layout

```text
atlas-insights/
├── apps/
│   ├── web/                # Vite + React + Tailwind dashboard
│   └── api/                # NestJS service: cache, throttle, helmet, validate
├── libs/
│   ├── shared-types/       # EarthquakeRecord, response envelopes, axis enums
│   └── shared-utils/       # CSV parser + sanitization (browser- and node-safe)
├── .claude/                # AI-collaborator rules, commands, agents, skills
├── nx.json
├── tsconfig.base.json
├── package.json            # npm workspaces + root scripts
├── CLAUDE.md               # Instructions for AI collaborators
├── INTERVIEWER.md          # Reviewer-facing design rationale & coverage matrix
└── SECURITY.md             # Threat model + control inventory
```

### Data flow (one direction, with the API in the middle)

```text
USGS CSV
   ↓ undici.request (timeout + retry)
apps/api/src/earthquakes/earthquakes.service.ts
   ↓ parseEarthquakeCsv (libs/shared-utils)
   ↓ in-memory cache (5 min TTL, in-flight de-dup)
GET /api/earthquakes (helmet, throttle, validate, sanitize-on-ingest)
   ↓ fetch (apps/web/src/api/earthquakes.ts)
   ↓ TanStack Query
   ↓ useFilteredEarthquakes (Zustand filter slice)
       ├→ ChartPanel  →  EarthquakeChart    (activeView === 'chart')
       ├→ MapPanel    →  EarthquakeMap      (activeView === 'map')
       └→ TablePanel  →  EarthquakeTable
            ↑ Selection / hover loops back via Zustand + Context
```

---

## 🚀 Quick start

### Prerequisites

- **Node 20+** (NestJS 10 + Vite 5 baseline)
- **npm 9+** (uses npm workspaces)

### Install once

```bash
npm install
```

This installs the root toolchain plus both apps and both libs in one pass via npm workspaces.

### Run both apps in parallel (default)

```bash
cp .env.example .env       # optional — defaults work out of the box
npm run dev
```

This starts:

- The NestJS API on <http://localhost:3000/api>
- The React dashboard on <http://localhost:5173>

Vite proxies `/api/*` → `http://localhost:3000/api/*` so the FE has no CORS concerns in development.

### Run just one side

```bash
npm run dev:web    # FE only — defaults to hitting /api (won't work standalone unless...)
npm run dev:api    # API only
```

To run the FE **without** the API (static demo mode), set `VITE_USE_DIRECT_FEED=true` in your `.env` — the FE will fall back to fetching the USGS CSV directly.

### Useful scripts

| Script              | Purpose                                                   |
| ------------------- | --------------------------------------------------------- |
| `npm run dev`       | Both apps in parallel                                     |
| `npm run build`     | Type-check & build API, then web                          |
| `npm run typecheck` | `tsc --noEmit` across both apps                           |
| `npm run lint`      | ESLint zero-warning across both apps                      |
| `npm run format`    | Prettier write                                            |
| `npm run graph`     | Open the Nx project graph in your browser                 |
| `npm run nx -- <…>` | Drop into Nx directly (e.g. `npm run nx -- run web:build`) |

---

## 📡 API surface

| Method | Path                       | Purpose                                                                 | Throttle      |
| ------ | -------------------------- | ----------------------------------------------------------------------- | ------------- |
| GET    | `/api/earthquakes`         | Cursor-paginated `{data, meta}` envelope with `ETag` / `304` support    | 60 / 60 s     |
| GET    | `/api/earthquakes/stats`   | Server-computed summary statistics, also `ETag`-aware                   | global (60 / 60 s) |
| GET    | `/api/health`              | Liveness + cache state, exempt from throttle                            | skip          |

Query parameters on `/api/earthquakes`:

| Param          | Type    | Bounds                                                         |
| -------------- | ------- | -------------------------------------------------------------- |
| `cursor`       | int     | 0–1 000 000 (0-indexed offset for pagination)                  |
| `limit`        | int     | 1–10 000 (page size; default 500 when `cursor` set)            |
| `minMagnitude` | int     | 0–10                                                           |
| `search`       | string  | 1–64 chars, printable (`[\p{L}\p{N}\s,.\-']+`)                 |
| `tsunamiOnly`  | boolean | strict — `true`/`false` only                                   |

Any other key returns a `400` (handled by the global `ValidationPipe`).

### Pagination + cache behaviour

- **Cursor-based pagination.** `?cursor=N&limit=M` returns `data[N : N+M]`, with `meta.nextCursor` set to `N+M` (or `null` when at the end) and `meta.total` set to the full server-side dataset size.
- **Pages are free server-side.** The full parsed dataset lives in one in-memory cache key — every page request is a slice of that array, not a re-parse and never a re-fetch (until the TTL expires).
- **ETag short-circuit.** Each response carries a weak `ETag` derived from the dataset version + query inputs. On a refresh the client sends `If-None-Match`; if unchanged, the API returns `304 Not Modified` with an empty body. Reloads cost ~200 bytes.
- **Stampede de-duplication.** Concurrent cache-misses share a single in-flight promise → exactly one upstream USGS call regardless of request volume.

The FE drives this from `useInfiniteQuery`: the first page (500 records) lands in ~200 ms, then subsequent pages auto-stream on a 250 ms idle tick. The chart, table, and stats all progressively fill from the same accumulated array.

---

## 📦 External dependencies

### Workspace root

| Package         | Role                                            |
| --------------- | ----------------------------------------------- |
| `nx`            | Monorepo task runner & project graph            |
| `npm-run-all`   | Parallel script orchestration                   |
| `typescript`    | Strict-mode type safety, shared compiler        |
| `eslint`, plugins | Lint + format pipeline                        |
| `prettier`      | Code formatting                                 |

### `apps/web`

| Package                                  | Role                                                   |
| ---------------------------------------- | ------------------------------------------------------ |
| `react`, `react-dom`                     | UI runtime                                             |
| `vite`, `@vitejs/plugin-react`           | Dev server + production bundle, `/api` proxy           |
| `@tanstack/react-query`                  | Server-state caching, retry/backoff                    |
| `@tanstack/react-query-devtools`         | Dev-only query inspector                               |
| `@tanstack/react-table`                  | Headless table model                                   |
| `@tanstack/react-virtual`                | Row windowing for the 10k-row table                    |
| `recharts`                               | Scatter chart                                          |
| `leaflet`, `react-leaflet`               | World-map view + OpenStreetMap tile rendering          |
| `zustand`                                | Global UI state                                        |
| `papaparse`                              | CSV parsing for the direct-feed fallback               |
| `tailwindcss`, `postcss`, `autoprefixer` | Styling                                                |

### `apps/api`

| Package                       | Role                                                          |
| ----------------------------- | ------------------------------------------------------------- |
| `@nestjs/core` + platform-express | App runtime                                               |
| `@nestjs/config`              | Env loader + class-validator schema                           |
| `@nestjs/cache-manager` + `cache-manager` | In-memory cache with TTL                          |
| `@nestjs/throttler`           | Per-IP rate limiter                                           |
| `helmet`                      | Security headers (CSP, X-Frame, HSTS, etc.)                   |
| `compression`                 | Response gzip                                                 |
| `class-validator`, `class-transformer` | DTO validation + safe transforms                     |
| `undici`                      | HTTP client for upstream USGS fetch (timeout-capable)         |
| `reflect-metadata`            | Decorator metadata for class-validator + Nest DI              |

### `libs/shared-utils`

- `papaparse` — only runtime dep; same parser runs on both ends of the wire.

---

## 🧠 State management approach (recap)

| Pattern           | Where                                                                          | Why                                                                                  |
| ----------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| **Props**         | `<EarthquakeChart>`, `<EarthquakeMap>`, `<EarthquakeTable>`, `<AxisSelector>`  | Pure presentational components stay snapshot- and Storybook-friendly                 |
| **React Context** | `SelectedEarthquakeContext`                                                    | Resolves `selectedId` → `EarthquakeRecord` once, shares across distant subtrees      |
| **Zustand**       | `useEarthquakeStore` — filters, axes, `activeView`, `selectedId`, `hoveredId`  | High-frequency cross-cutting UI state; selector subscriptions avoid re-render storms |

The canonical `selectedId` lives in Zustand; the Context derives the resolved record from `(records, selectedId)`. Two sources, single source of truth — see [`INTERVIEWER.md`](./INTERVIEWER.md) for the rationale.

---

## ⚖️ Trade-offs

- **No router.** Single-page dashboard. `pages/` is in place so adding one is non-disruptive.
- **No tests in this submission.** Pure helpers (`csv.ts`, `colors.ts`, `useEarthquakeStats`, `EarthquakesService.applyFilters`) are structured for trivial unit testing — see [`INTERVIEWER.md`](./INTERVIEWER.md) §4 for the plan I'd execute next.
- **In-memory API cache.** Survives within a single process. A multi-instance deploy would point `@nestjs/cache-manager` at Redis with a one-line change.
- **Synchronous CSV parsing in the API.** ~10k rows parses in <100 ms. If the feed scaled to 100k+ I'd move it to a worker thread.
- **Client-side filtering in the FE.** Re-runs on each keystroke. The API also supports filter params — at scale we'd debounce search and push filter execution server-side.

---

## 🔭 Future improvements

- Marker clustering on the map at low zoom levels (`react-leaflet-cluster`) — pays off once the visible dataset crosses ~2k markers.
- Time-series panel — hourly / daily event bins.
- Redis cache backend for multi-replica API.
- OpenAPI / Swagger doc surface on the API.
- Vitest + Testing Library suites for both apps; Playwright smoke test.
- Service Worker offline cache on the FE.

---

## 🤖 AI usage disclosure

This submission was built with the assistance of an AI pair-programmer (Claude Code). The collaboration looked like:

- **Architecture & monorepo decisions**: discussed and refined the split into apps/libs together; the API ↔ FE boundary contract (`EarthquakeListResponse` envelope, single `EarthquakeRecord` source of truth) was co-designed.
- **Boilerplate**: Vite / Nx / NestJS / Tailwind / ESLint configs drafted by the AI and reviewed.
- **Components & modules**: chart, table, NestJS service, security middleware, DTOs — iterated in tandem. I drove requirements; the AI proposed implementations; I reviewed every diff for correctness and security.
- **Documentation**: this README, [`INTERVIEWER.md`](./INTERVIEWER.md), [`CLAUDE.md`](./CLAUDE.md), [`SECURITY.md`](./SECURITY.md), and the [`.claude/`](./.claude/) rule files were AI-drafted from a structured outline and edited.
- **What I did NOT delegate**: the decision to add the NestJS layer (and the trade-off discussion that led to it), the security threat model, the choice of dependencies, and the state-architecture boundaries.

---

## 📚 Further reading

- [`INTERVIEWER.md`](./INTERVIEWER.md) — design rationale, requirement coverage matrix, testing plan.
- [`SECURITY.md`](./SECURITY.md) — threat model + concrete controls.
- [`CLAUDE.md`](./CLAUDE.md) — repo-level instructions for AI assistants.
- [`.claude/`](./.claude/) — modular rules, commands, agents, skills.

---

## 📜 License

MIT — see [`LICENSE`](./LICENSE).

Submitted for review · Built with TypeScript end-to-end.

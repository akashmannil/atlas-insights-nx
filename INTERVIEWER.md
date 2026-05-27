# Notes for the reviewer

Companion to [`README.md`](./README.md). The README is for anyone landing on the repo; this file is for **you, the interviewer**.

Goal: make evaluation mechanical. Map every requirement to where it lives, explain the non-obvious choices, surface what's beyond the brief and why, document what I'd do next.

---

## 0. What changed since the FE-only version

This repo started life as a single Vite + React + TypeScript project that fulfilled the assessment brief end-to-end. It has since been promoted to an **Nx monorepo** with a dedicated **NestJS caching / security API** in front of the public USGS feed.

**Why the promotion**:

- Demonstrates fullstack capability and real production patterns (caching, throttling, validation, sanitization, structured logging).
- Eliminates the FE → public-CDN coupling — the API hides the upstream URL and enforces a uniform contract.
- Gives a credible surface for the kind of security/quality conversation a senior frontend role expects to have.

**Why this is still faithful to the brief**:

- The FE still independently fulfils every requirement (it can run standalone via `VITE_USE_DIRECT_FEED=true`).
- All FE evaluation criteria (architecture, state, chart/table sync, polish, a11y) live in `apps/web` and can be reviewed in isolation.
- The API is **additive** — it doesn't change what's being asked for, it shows what's possible above it.

If you only have 15 minutes, **read `apps/web/src` and skim `apps/api/src/earthquakes`** — that's the assessment + the most interesting backend code. The rest is plumbing.

---

## 1. Requirements coverage matrix

### Core requirements (from the brief)

| Requirement                                                                  | Implementation                                                                                                | File(s)                                                                                                                          |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Fetch geographic data from a public source                                   | NestJS service fetches USGS CSV (`undici` + timeout), parses, caches, exposes JSON envelope to FE             | `apps/api/src/earthquakes/earthquakes.service.ts`, `apps/web/src/api/earthquakes.ts`, `apps/web/src/hooks/useEarthquakes.ts`     |
| Two-panel responsive layout (chart left, table right)                        | CSS grid; collapses to a single column under the `xl` breakpoint                                              | `apps/web/src/pages/DashboardPage.tsx`                                                                                            |
| Chart panel — scatter plot with X / Y axis pickers                           | Recharts `<ScatterChart>` with custom shape; `<Select>` dropdowns                                             | `apps/web/src/components/chart/EarthquakeChart.tsx`, `apps/web/src/components/chart/AxisSelector.tsx`                            |
| Geographic view (additive)                                                   | react-leaflet world map with OpenStreetMap tiles; segmented Chart/Map selector toggles `activeView` in store  | `apps/web/src/components/map/EarthquakeMap.tsx`, `apps/web/src/components/map/MapPanel.tsx`, `apps/web/src/components/map/ViewSelector.tsx` |
| Data panel — scrollable table with all rows                                  | Virtualized TanStack Table (handles full 10k+ payload)                                                        | `apps/web/src/components/table/EarthquakeTable.tsx`, `apps/web/src/components/table/columns.tsx`                                 |
| Loading + empty + error states                                               | Skeleton, EmptyState, ErrorState components, plus a top-level `ErrorBoundary`                                 | `apps/web/src/components/ui/*`                                                                                                    |
| **Table → Chart** sync                                                       | Hover writes `hoveredId` to Zustand; chart subscribes, renders a highlight overlay                            | `apps/web/src/components/table/TablePanel.tsx`, `apps/web/src/components/chart/EarthquakeChart.tsx`                              |
| **Chart → Table** sync                                                       | Chart writes `selectedId`; table virtualizer `scrollToIndex` on change                                        | `apps/web/src/components/chart/ChartPanel.tsx`, `apps/web/src/components/table/EarthquakeTable.tsx`                              |

### State-sharing techniques

| Pattern        | Demonstrated by                                                          | Why it's the right fit there                                                                                                            |
| -------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Props          | `<EarthquakeChart>`, `<EarthquakeTable>`, `<AxisSelector>`, `<StatsBar>` | Pure presentational components — keeps them snapshot- / Storybook-friendly                                                              |
| React Context  | `SelectedEarthquakeProvider` + `useSelectedEarthquake()`                 | Resolved selection record consumed by disconnected subtrees — the canonical "avoid prop drilling" use case from the brief               |
| Zustand        | `useEarthquakeStore` (filters, axes, `selectedId`, `hoveredId`)          | High-frequency cross-cutting UI state; selector subscriptions mean axis swaps don't re-render the table, hover doesn't recompute the chart |

The deliberate split — **Zustand owns the id, Context exposes the resolved record** — is documented in the docblocks at the top of [`useEarthquakeStore.ts`](apps/web/src/store/useEarthquakeStore.ts) and [`SelectedEarthquakeContext.tsx`](apps/web/src/context/SelectedEarthquakeContext.tsx).

### Delivery checklist

| Asked for                                  | Where                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| Git repository                             | This repo                                                                   |
| README with setup, dependencies, decisions | [`README.md`](./README.md)                                                  |
| Code comments where non-obvious            | Throughout — focused on hooks, store, context, parser, NestJS modules       |
| AI usage disclosure                        | [`README.md` § AI usage](./README.md#-ai-usage-disclosure)                   |

---

## 2. Architectural decisions worth calling out

### 2.1 Why an Nx monorepo (and not just two folders)

- **One TypeScript compiler graph.** A change to `EarthquakeRecord` instantly breaks any FE or API consumer at typecheck time — no possibility of wire drift.
- **One dependency manifest tree.** npm workspaces hoist common deps; lockfile lives at the root.
- **Cacheable task graph.** `nx graph`, `nx affected` — the kinds of capabilities that pay back from day one on real teams.
- **Familiar layout.** `apps/*` + `libs/*` is the de-facto convention.

I deliberately used `nx:run-commands` executors that wrap the apps' own `npm` scripts. This means each app can still be developed in isolation with `cd apps/web && npm run dev` — Nx is a force-multiplier, not a lock-in.

### 2.2 Why NestJS and not Express / Fastify directly

- **Decorator-driven DI** gives a tidy place for the security middleware to live (`APP_GUARD`, `APP_INTERCEPTOR`, `APP_FILTER`).
- **First-class `ConfigModule` + `class-validator` env schema** — bootstrap fails loudly on bad config.
- **First-class `@nestjs/throttler`, `@nestjs/cache-manager`** — battle-tested implementations of two patterns I'd otherwise have to roll.
- **Module boundaries** map nicely to the cross-cutting concerns I want to demonstrate (security, observability, domain).

The whole API is ~6 files under `apps/api/src/` — small enough to read end-to-end in 5 minutes.

### 2.3 Why the canonical `EarthquakeRecord` lives in `libs/shared-types`

The single most expensive bug in fullstack work is "the BE returns shape A, the FE expects shape B". Putting the record interface in a shared lib eliminates this by construction — both ends import the same source.

The lib has **zero runtime dependencies and no framework imports**, so it's safely importable from a browser bundle, a Node server, an edge function, or a future Web Worker.

### 2.4 Why the CSV parser is also shared

`parseEarthquakeCsv` lives in `libs/shared-utils` and is used by:

1. The API's `EarthquakesService` (server-side ingestion).
2. The FE's "direct mode" escape hatch (when `VITE_USE_DIRECT_FEED=true`).

Same parsing rules at both ends → same null-handling, same sanitization, same drop-rows-with-missing-geometry behaviour. If we ever moved parsing into a Web Worker, the lib's framework-agnostic shape makes that a one-line import change.

### 2.5 Why the API's selection / filter logic mirrors the FE's

`EarthquakesService.applyFilters` and the FE's `useFilteredEarthquakes` apply the same predicate. That's intentional — a future "URL-shareable filter state" feature can be served purely server-side without a behaviour change. Today, both apply locally and the API filter params are unused by the FE (which fetches everything once and filters in-memory for the snappiest UX).

### 2.6 Why the FE keeps a "direct mode"

Portfolio context: if a recruiter loads this on GitHub Pages with no backend deployed, the dashboard still works. `VITE_USE_DIRECT_FEED=true` bypasses the API and parses USGS directly. Useful, free to add (the parser is already shared), and stays clearly documented.

### 2.7 Why memoization is sparse, not blanket

Same rule as the FE-only version: `React.memo` only on components that (a) receive stable props and (b) are expensive to render. Wrapping every component in `memo` is a known anti-pattern.

### 2.8 Why a toggleable Chart / Map view instead of a third panel

The dashboard already has a left + right two-column grid (visualisation + table). Adding the geographic view as a *third* panel would compress both visualisations into halves of the left column, hurting legibility at every breakpoint. A segmented selector that switches the left panel between Chart and Map keeps the layout intact and gives each view the full width of the visualisation column.

`activeView: 'chart' | 'map'` lives in the same Zustand store as the rest of the UI state — same selector-subscription discipline, no new state layer. Both the chart and map panels host the same `<ViewSelector>` component in their card header so the toggle is always co-located with the view it controls.

### 2.9 Why react-leaflet (and not Mapbox / MapLibre / deck.gl)

- **No API key, no paid tier.** OpenStreetMap tiles via the standard CDN are free for non-abusive usage. Mapbox would have required a key and a billing relationship.
- **Smallest dependency footprint that does the job.** Leaflet (~40 KB gz) + react-leaflet (~10 KB gz). MapLibre GL would have brought ~200 KB of WebGL machinery for a use case that doesn't need it.
- **`CircleMarker` instead of `Marker`.** Default Leaflet markers ship with bundler-unfriendly image paths. SVG circle markers also let us reuse the existing magnitude → colour ramp from the scatter chart, so the two views speak the same visual language.
- **Native two-way selection.** The map subscribes to the same `selectedId` / `hoveredId` in Zustand that the chart and table already use; selecting from any of the three highlights everywhere.

### 2.9 Why a Docker stack + CI pipeline (and the shape of each)

Originally I left these out to keep the review surface small. They're added now because:

- A **multi-stage Dockerfile per app** plus a **combined `docker compose`** gives reviewers a single-command parity-with-prod run that doesn't depend on the host's Node version.
- nginx fronting the SPA and reverse-proxying `/api` is the same shape a real deploy would take — `VITE_API_BASE_URL=/api` is baked into the bundle at build time, so there's no CORS hop and no runtime config injection.
- The **api container is not host-exposed**; only nginx is. The API is reachable solely from the docker network, which mirrors the typical "private service behind a public edge" topology.
- The API container runs as **non-root under `tini`** so signal handling + zombie-reaping is correct; Nest's `enableShutdownHooks()` actually fires on `SIGTERM`.
- The build context is locked down via [`.dockerignore`](./.dockerignore) — `node_modules`, `dist`, env files, `.git`, and Claude-local files never enter the image.

CI is intentionally minimal: a `verify` job (lint → typecheck → build with npm-cache reuse) followed by a `docker` job that builds both images via Buildx with a GHA layer cache. Images aren't pushed — the job is a smoke test that the Dockerfiles still produce a runnable artifact. Concurrency is grouped per-ref so a new push cancels superseded runs.

See [`.github/workflows/ci.yml`](./.github/workflows/ci.yml), [`apps/api/Dockerfile`](./apps/api/Dockerfile), [`apps/web/Dockerfile`](./apps/web/Dockerfile), [`apps/web/nginx.conf`](./apps/web/nginx.conf), [`docker-compose.yml`](./docker-compose.yml).

### 2.10 What I explicitly did NOT add

- **A database.** Pointless for a public read-only feed.
- **Authentication.** No user surface to protect.
- **OpenAPI / Swagger.** Worth ~30 minutes of work; happy to add as a follow-up. Not in scope for the assessment.
- **A test suite.** See §4 for the plan.
- **A WAF / CDN-level DDoS layer.** That's the deployment platform's job; the API's rate limiter handles application-layer abuse. See [`SECURITY.md`](./SECURITY.md) §4 for the explicit out-of-scope list.
- **Pushing CI images to a registry.** The current CI only builds-and-discards. Adding GHCR push on tag is a follow-on once a release process exists.

---

## 3. Security posture (summary)

Detailed inventory in [`SECURITY.md`](./SECURITY.md). The headline:

- `helmet()` with tightened CSP (`default-src 'none'` — the API serves no HTML).
- Per-IP throttling (`@nestjs/throttler`) tuned per-route, with `SkipThrottle` on health.
- Global `ValidationPipe({whitelist, forbidNonWhitelisted})` + strict DTO — unknown query keys are a 400, regex-bounded `search`.
- Untrusted-input sanitization at the ingestion boundary (`libs/shared-utils/src/sanitize.ts`): strips control characters, HTML-like tags, caps length.
- `class-validator`-validated env schema; HTTPS-only upstream URL.
- Sanitized error envelope via global `HttpExceptionFilter`; stack traces only in server logs for 5xx.
- `LoggingInterceptor` strips CR/LF from URLs and IPs (no log injection) and never logs bodies.
- `app.set('trust proxy', 1)` — accurate client IP without enabling XFF spoofing.
- In-flight de-duplication of upstream fetches — cold-cache stampede triggers exactly one USGS call.

---

## 4. Testing plan I would execute next

In this order:

1. **Pure helpers** — `parseEarthquakeCsv`, `sanitizePlace`, `magnitudeStyle`, `useEarthquakeStats`, `EarthquakesService.applyFilters`.
2. **Store actions** — Zustand store in isolation: selection toggle, filter reset, axis swap.
3. **Service tests** — `EarthquakesService` with a stubbed `Cache` + mocked `undici` (`MockAgent`). Cover cache-hit, cache-miss, in-flight dedup, upstream failure → 503.
4. **Controller validation** — supertest `GET /api/earthquakes?minMagnitude=999` → 400; unknown query key → 400.
5. **FE component tests** — render `<EarthquakeTable>` with fixture rows, assert row click fires the handler.
6. **One integration test** — render `<DashboardPage>` with a mocked fetch returning a fixture envelope; click a row, assert chart highlight overlay appears.
7. **One Playwright smoke** — boot both apps against a fixture USGS URL (MSW server), click a chart point, assert the matching row is visible and selected.

Tooling: **Vitest** (jsdom for FE, node for API), **@testing-library/react**, **supertest** for the API, **msw** for fetch mocking, **Playwright** for the smoke test.

---

## 5. How to evaluate this submission in 15 minutes

1. `npm install` from the workspace root — installs both apps + libs in one pass. (Or skip this and the next step: `docker compose up --build` boots the whole stack on `http://localhost:8080` with no Node toolchain on the host.)
2. `npm run dev` — boots API (`:3000`) and web (`:5173`) in parallel.
3. Open <http://localhost:5173>. Dashboard populates within ~1 s on a normal connection.
4. **Hover a chart point** → matching table row highlights and scrolls into view.
5. **Click a row** → chart marker grows a focus ring, selection banner appears.
6. **Toggle the Chart / Map selector** in the visualisation panel header → map renders the same filtered set; clicking a marker selects the same record everywhere; selection auto-pans the map.
7. Type a city name → both chart and table shrink in lockstep.
8. Drag the magnitude slider → stats tiles + chart + table all update.
9. Click **Export CSV** → file with the currently visible rows downloads.
10. Hit <http://localhost:3000/api/earthquakes/stats> directly to see the API in action.
11. Curl with garbage query: `curl 'http://localhost:3000/api/earthquakes?bogus=1'` → 400, demonstrating `forbidNonWhitelisted`.
12. Open DevTools → Network: only the `/api/*` requests go out (no leak to USGS from the client when in API mode).
13. Open these files for the architecture story:
    - `apps/web/src/store/useEarthquakeStore.ts` — FE state boundaries.
    - `apps/web/src/context/SelectedEarthquakeContext.tsx` — Context derivation pattern.
    - `apps/web/src/components/map/MapPanel.tsx` — Map panel + selection sync.
    - `apps/api/src/main.ts` + `app.module.ts` — API security wiring.
    - `apps/api/src/earthquakes/earthquakes.service.ts` — caching + stampede prevention.
    - `libs/shared-types/src/index.ts` — the wire contract.
14. `npm run lint && npm run typecheck` — both should pass clean.

---

## 6. Performance & pagination

The dashboard was previously fetching the full ~10k-row dataset as a single JSON payload, with FE parse + filter happening once everything arrived. On slow connections this blocked first paint for several seconds.

It now uses a layered fetch-and-cache strategy:

| Layer                | Mechanism                                                                                            | Win                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| API in-memory cache  | One key holds the parsed dataset for 5 min; pagination is `array.slice()` on the cached array        | Page requests never re-parse and almost never re-fetch upstream                      |
| HTTP `ETag` / `304`  | Weak ETag derived from dataset version + query inputs; controller returns 304 on `If-None-Match` hit | Refresh / re-mount costs ~200 bytes per page instead of ~200 KB                      |
| Cursor pagination    | `GET /api/earthquakes?cursor=N&limit=M` returns `{data, nextCursor, total}`                          | First page (500 records) lands in ~200 ms; rest stream progressively                 |
| `useInfiniteQuery`   | FE accumulates pages; auto-prefetches next on a 250 ms idle tick; table virtualizer triggers on near-end scroll | Chart + table populate progressively from one source of truth                        |
| Stampede de-dup      | One shared in-flight promise across concurrent cache-misses                                          | A burst of cold-cache requests triggers exactly one upstream USGS call               |
| `Cache-Control`      | `public, max-age=60, s-maxage=120` on list + stats endpoints                                         | Browsers and CDNs keep their own short copy                                          |
| `compression`        | gzip on all responses (Nest middleware)                                                              | ~70% reduction in JSON payload size on the wire                                      |
| Separate stats query | `/api/earthquakes/stats` runs in parallel with the first page; ~80-byte response                     | Summary tiles render *before* the records do                                         |
| `useFilteredEarthquakes` fast path | Returns the input array unchanged when no filters are active                          | Eliminates an O(n) walk + allocation on every keystroke                              |

The end-to-end effect: the dashboard is interactive in **<500 ms** on a cold load over a normal connection, vs. several seconds before. A warm reload (same TTL window) costs **one round-trip per page + zero JSON body bytes** thanks to ETag short-circuits.

### Pagination UX

The event records table uses **discrete page navigation** (Prev / 1 / 2 / 3 / … / Next at the bottom) rather than infinite scroll:

- Initial load fetches **only the first server page** (500 records). The chart, stats tiles, and first 50 table rows render together — interactive in one round-trip.
- Clicking **Next** advances `currentPage` in the Zustand store. If the target page's data isn't already in the FE cache, exactly one server-page fetch fires; the pager shows a "Loading…" indicator during the brief wait.
- Filter changes (search, magnitude slider, tsunami toggle) reset `currentPage` to 0 — implemented inside the store setters so it can't be forgotten by callers.
- Chart → Table sync: clicking a chart point whose record lives on a different page **auto-jumps the table to that page** before scrolling the row into view.
- The "+" indicator next to the loaded count signals when more pages exist server-side but haven't been fetched yet.

This replaces an earlier infinite-streaming model that, while elegant, made every page load feel like "everything is loading" — users couldn't tell when the dataset was settled. Discrete pages give explicit control and bounded per-click bandwidth.

## 7. Known limitations

- The USGS feed occasionally returns HTTP 5xx under load. The API insulates the FE from this — first failure surfaces as a 503 to the client; React Query retries.
- Filtering is in-memory on both ends and not URL-synced. Refresh clears state.
- The map renders one `CircleMarker` per visible record. Past ~5k visible markers the interaction starts to chug; the next step is `react-leaflet-cluster` at low zoom levels.
- Map tiles are fetched from the public OpenStreetMap CDN. Production deployments should either self-host tiles or proxy through a tile provider with a known SLA.
- API cache is in-memory and per-process. Multi-replica deploy would point `@nestjs/cache-manager` at Redis.
- Server-side filters (`minMagnitude`, `search`, `tsunamiOnly`) exist on the API but aren't used by the FE today — filtering still happens client-side on accumulated pages. Pushing filters to the server is the obvious next step for datasets that grow beyond ~50k rows.

---

Thanks for reviewing. Happy to walk through any specific decision in a follow-up.

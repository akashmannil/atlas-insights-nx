# Architecture

## Workspace structure

```text
atlas-insights/
├── apps/
│   ├── web/      # React dashboard
│   └── api/      # NestJS caching/security service
├── libs/
│   ├── shared-types/   # wire contract (zero deps) — EarthquakeRecord, envelopes, DEFAULT_PAGE_SIZE
│   └── shared-utils/   # CSV parser, sanitizePlace, computeEarthquakeStats (env-agnostic)
```

## Project boundaries (non-negotiable)

| From            | May import from                                   | May NOT import from           |
| --------------- | ------------------------------------------------- | ----------------------------- |
| `apps/web`      | `libs/shared-types`, `libs/shared-utils`          | `apps/api`                    |
| `apps/api`      | `libs/shared-types`, `libs/shared-utils`          | `apps/web`                    |
| `libs/*`        | other `libs/*` (only if needed, document why)     | `apps/*`                      |

The two apps' only contract is the wire format in `libs/shared-types`. If you find yourself wanting to import across that boundary, you actually want to add a new shared type — do that instead.

## Data flow (one direction)

```text
USGS CSV
   ↓ undici.request (timeout + retry)
apps/api/src/earthquakes/earthquakes.service.ts
   ↓ libs/shared-utils → parseEarthquakeCsv + sanitizePlace
   ↓ @nestjs/cache-manager (5 min TTL, in-flight de-dup)
GET /api/earthquakes?cursor=&limit=    (helmet, throttle, validate)
   ↓ fetch (apps/web/src/api/earthquakes.ts) — pagination params only
   ↓ TanStack Query (apps/web/src/hooks/useEarthquakes.ts)
   ↓ useFilteredEarthquakes (consumes Zustand filter slice — client-side)
       ├→ ChartPanel → EarthquakeChart       (when activeView === 'chart')
       ├→ MapPanel   → EarthquakeMap         (when activeView === 'map')
       └→ TablePanel → EarthquakeTable

GET /api/earthquakes/stats             (helmet, throttle, validate)
   ↓ libs/shared-utils → computeEarthquakeStats
   ↓ TanStack Query (apps/web/src/hooks/useEarthquakeStats.ts)
   └→ StatsBar

Selection / hover loops back via:
   - Zustand (selectedId, hoveredId, activeView — canonical)
   - SelectedEarthquakeContext (resolved record — derived)

The ViewSelector segmented control (chart/map) is hosted in the primary
panel header. Each panel reads `activeView` from Zustand independently;
DashboardPage decides which container to render, but the selector itself
lives next to the panel's own actions so the toggle is co-located with
the visualisation it controls.

Filter rule: record-level filters (magnitude / search / tsunami) are FE-only.
The API surface is pagination-only — see INTERVIEWER.md §2.5.
```

## State layers (FE)

| Layer    | What it holds                                          | When to use                                              |
| -------- | ------------------------------------------------------ | -------------------------------------------------------- |
| Props    | Pure data + callbacks                                  | Parent → presentational child                            |
| Context  | Resolved selection record + setter                     | Distant subtrees need the same derived value             |
| Zustand  | Filters, axis pickers, active view, selected/hovered id| High-frequency UI state, anything cross-cutting          |
| Query    | Server data (the earthquake records)                   | Anything that came from a network call                   |

## Component layers (FE)

| Layer                                    | Purpose                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| `pages/`                                 | Composition. Thin. No UI state of its own.                             |
| `components/<feature>/<…Panel>`          | Container — concentrates store subscriptions, passes primitives down.  |
| `components/<feature>/<…Chart\|Table>`   | Pure presentational. `React.memo`. Receives data + callbacks.          |
| `components/ui/`                         | Headless primitives. No business logic.                                |
| `hooks/`                                 | Reusable derivations.                                                  |
| `utils/`                                 | Pure functions.                                                        |

## Module layers (API)

| Layer            | Purpose                                                              |
| ---------------- | -------------------------------------------------------------------- |
| `main.ts`        | Bootstrap + global middleware order. Single source of truth.         |
| `app.module.ts`  | Cross-cutting module wiring (Config, Cache, Throttler, Guards).      |
| `<feature>/module.ts`     | Per-feature module — controllers + services.                |
| `<feature>/controller.ts` | Thin: DTO in → service call → typed response out.            |
| `<feature>/service.ts`    | Owns business logic, caching, upstream calls.                |
| `<feature>/dto/*.ts`      | class-validator decorated request shapes.                    |
| `common/filters/`         | Exception filter — sanitized error envelope.                 |
| `common/interceptors/`    | Logging, transforms.                                         |
| `config/`                 | env schema validation.                                       |

## When to break the pattern

- **Adding a fourth FE state layer** — almost never. Write the problem down in the PR description and propose the alternative explicitly.
- **Putting server data in Zustand** — never. If you need to mutate cached data, use Query's `setQueryData`.
- **Bypassing the `<Panel>` boundary** — never. The point of the container is to be the single subscription site.
- **Importing across `apps/web` ↔ `apps/api`** — never. Add a type to `libs/shared-types` instead.
- **Putting business logic in a controller** — never. That's what services are for.

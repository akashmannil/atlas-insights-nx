---
description: Triage and fix a bug reported against the Atlas Insights dashboard or API.
---

A bug has been reported. Walk through it in this order — do not jump to a fix.

## 1. Reproduce & localize

- Restate the bug in your own words.
- Identify which **app** owns the symptom: `apps/web` (FE render / interaction) or `apps/api` (network / data shape / cache).
- Identify which **state or module layer** is likely involved.

If the report is too vague to reproduce, ask one specific clarifying question.

## 2. Where to start reading

### Web bugs

| Symptom                              | Start here                                                            |
| ------------------------------------ | --------------------------------------------------------------------- |
| Chart render bug                     | `apps/web/src/components/chart/EarthquakeChart.tsx`                   |
| Map render / tile bug                | `apps/web/src/components/map/EarthquakeMap.tsx` + `apps/web/src/main.tsx` (Leaflet CSS import) |
| Map ↔ chart ↔ table sync bug         | `apps/web/src/store/useEarthquakeStore.ts` (`selectedId` / `hoveredId` / `activeView`) |
| View toggle stuck or doesn't switch  | `apps/web/src/components/map/ViewSelector.tsx` + `pages/DashboardPage.tsx` |
| Table render bug                     | `apps/web/src/components/table/EarthquakeTable.tsx`                   |
| Chart ↔ table sync bug               | `apps/web/src/store/useEarthquakeStore.ts` + `context/SelectedEarthquakeContext.tsx` |
| Filter bug                           | `apps/web/src/hooks/useFilteredEarthquakes.ts`                        |
| Network error message wrong          | `apps/web/src/api/earthquakes.ts` + `hooks/useEarthquakes.ts`         |

### API bugs

| Symptom                              | Start here                                                            |
| ------------------------------------ | --------------------------------------------------------------------- |
| Wrong response shape                 | `apps/api/src/earthquakes/earthquakes.service.ts` + `libs/shared-types/src/index.ts` |
| 400 on valid input / 200 on invalid  | `apps/api/src/earthquakes/dto/earthquakes-query.dto.ts`               |
| Stale data                           | `apps/api/src/earthquakes/earthquakes.service.ts` (cache TTL + de-dup) |
| Upstream times out / 503             | `EarthquakesService.fetchAndCache` + `.env` `USGS_FEED_URL`           |
| Throttle firing too aggressively     | `apps/api/src/app.module.ts` + per-route `@Throttle()` decorators     |
| CORS rejected                        | `apps/api/src/main.ts` + `API_CORS_ORIGINS` env var                   |
| Wrong env value accepted             | `apps/api/src/config/env.validation.ts`                               |

### Shared bugs

If both apps misbehave on the same data, the bug is almost certainly in:

- `libs/shared-utils/src/csv.ts` — CSV parsing.
- `libs/shared-utils/src/sanitize.ts` — input sanitization.
- `libs/shared-types/src/index.ts` — the wire contract.

## 3. Fix

- Make the smallest change that solves the problem.
- If the root cause is in a different module than the symptom, fix the root cause.
- If the fix changes externally-visible behavior, update the relevant docblock or `INTERVIEWER.md` entry.
- If the fix touches `apps/api` input handling, re-read `SECURITY.md` and confirm no control was weakened.

## 4. Verify

- `npm run typecheck && npm run lint` — must pass clean.
- If FE: open the app and manually exercise the broken path. Then exercise one *adjacent* path that could plausibly break from the same change.
- If API: `curl` the endpoint with both valid and invalid input. Confirm 4xx vs 5xx are correctly differentiated.

## 5. Report

```text
Root cause: <one sentence>
Fix: <the diff, with one line of explanation per non-obvious change>
Verification: <what you manually tested>
Regression risk: <adjacent paths that could plausibly break>
Security delta: <none | <explanation>>
```

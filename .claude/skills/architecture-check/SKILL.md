---
name: architecture-check
description: Quick gut-check against the Atlas Insights monorepo architecture rules. Invoke before merging anything that touches state, types, security, or feature boundaries.
---

# Architecture check

Use this skill before merging a change that crosses a module / app / lib boundary. It's a 60-second sanity check, not a full review.

## What to verify

1. **App-to-app isolation** — `apps/web` and `apps/api` must not import from each other.
   - `grep -rE "from ['\"]\.\.\/\.\.\/api" apps/web/src` → must return zero hits.
   - `grep -rE "from ['\"]\.\.\/\.\.\/web" apps/api/src` → must return zero hits.

2. **Lib-from-app isolation** — `libs/*` must not import from `apps/*`.
   - `grep -rE "from ['\"].*apps/" libs/` → must return zero hits.

3. **Domain type single source** — `EarthquakeRecord` must only be declared once.
   - `grep -rE "interface EarthquakeRecord" .` → exactly one hit (in `libs/shared-types/src/index.ts`).

4. **No `any`** — `grep -nE "\\bany\\b" {apps,libs}/**/*.{ts,tsx}` → zero hits outside comments.

5. **Server data location** — `useEarthquakeStore` must not hold records.
   - Open `apps/web/src/store/useEarthquakeStore.ts` and confirm the state shape contains *ids*, not full records.

6. **API security guards in place** — quick scan of `apps/api/src/main.ts` should still show:
   - `helmet(...)`
   - `app.useGlobalPipes(new ValidationPipe(...))`
   - `app.enableCors({ ... })`
   - `app.set('trust proxy', 1)`
   - `app.useGlobalFilters(new HttpExceptionFilter())`

7. **No new top-level dependencies** without justification.

## Output

A 7-line report:

```text
App isolation:          PASS / FAIL <details>
Lib-from-app isolation: PASS / FAIL <details>
Domain type SSOT:       PASS / FAIL <details>
No `any`:               PASS / FAIL <details>
Server data location:   PASS / FAIL <details>
API security guards:    PASS / FAIL <details>
Dependencies:           PASS / FAIL <details>
```

If every line is PASS, output a single line: `Architecture clean — safe to merge.`

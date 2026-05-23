# Testing

There is no test suite in this submission — see `INTERVIEWER.md` §4 for the plan I'd execute next.

If you're adding tests, this is the order and tooling per app/lib.

## Tooling

- **Vitest** for all unit + integration tests (jsdom env for `apps/web`, node env for `apps/api` and `libs/*`).
- **@testing-library/react** for FE components.
- **supertest** + Nest's `Test.createTestingModule` for API endpoint tests.
- **msw** (FE) / **undici `MockAgent`** (API) for network mocking — never reach the real USGS feed in tests.
- **Playwright** for the single smoke test that exercises both apps.

## What to test, in order

1. **Pure helpers first** — `libs/shared-utils/src/csv.ts`, `libs/shared-utils/src/sanitize.ts`, `apps/web/src/utils/colors.ts`. High coverage, low cost.

2. **Pure derivations** — `apps/web/src/hooks/useEarthquakeStats.ts`, `EarthquakesService.applyFilters`.

3. **Zustand store actions** — toggle selection, reset filters, swap axes.

4. **API service** — `EarthquakesService` with stubbed `Cache` + mocked `undici`. Cover: cache hit, cache miss, in-flight de-dup, upstream failure → 503.

5. **API controller validation** — `supertest` against the boot app: malformed query → 400, unknown query key → 400, valid query → 200 with the expected envelope.

6. **FE components** — render with fixture data, assert callback invocation. Don't test Recharts internals; test our handlers.

7. **One integration test** — render `<DashboardPage>` with `msw` returning a fixture envelope; click a row, assert chart highlight overlay appears.

8. **One Playwright smoke** — boot both apps against a fixture URL; click a chart point, assert the matching row is visible and selected.

## What NOT to test

- Recharts internals.
- TanStack Table / Virtual internals.
- NestJS / Express internals.
- Tailwind class strings.
- Visual regression — out of scope for this project.

## Patterns to follow

- Always use a fixture CSV. Don't synthesize records inline in every test.
- Prefer user-visible behavior over implementation details — `fireEvent.click(row)` then assert highlight, not `expect(setSelectedId).toHaveBeenCalled()`.
- API tests should use `Test.createTestingModule` with the real `EarthquakesModule`, but override the upstream mock. Don't construct services manually — you'll miss DI wiring bugs.
- Never test multiple unrelated assertions in one test. One test, one behavior.

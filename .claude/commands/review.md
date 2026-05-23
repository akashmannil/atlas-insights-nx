---
description: Review pending changes against this monorepo's architectural rules.
---

You are reviewing a pull request against the **Atlas Insights** monorepo.

Follow this checklist in order. Stop and report at the first major issue.

## 1. Pre-flight

Run in parallel:

```bash
git status
git diff --staged
git diff
npm run typecheck
npm run lint
```

If any fail, surface that first. Do not proceed to deeper review.

## 2. Boundary check

For each changed file, identify which app/lib it lives in and verify the change respects `.claude/rules/architecture.md`:

- `apps/web` may only import from `libs/shared-types`, `libs/shared-utils`. Never from `apps/api`.
- `apps/api` may only import from `libs/shared-types`, `libs/shared-utils`. Never from `apps/web`.
- `libs/*` may never import from `apps/*`.
- Server data must not be stored in Zustand.
- Domain types must come from `libs/shared-types`. Grep for re-declarations.

## 3. Security check (only if `apps/api/` changed)

Read `.claude/rules/api.md` and `SECURITY.md`. Flag anything that:

- Adds a new endpoint without a DTO.
- Logs request/response bodies, headers, or any unsanitized string.
- Removes or weakens `helmet`, `ValidationPipe`, `ThrottlerGuard`, CORS allowlist, or the trust-proxy setting.
- Adds a `process.env.*` read outside `env.validation.ts` / `main.ts`.
- Calls an upstream without `bodyTimeout` and `headersTimeout`.
- Returns raw `Error.message` or stack traces to clients.

## 4. Code quality

- `any` types (lint should catch most, but check inline `eslint-disable`).
- Components > 200 lines — propose extraction.
- Controllers with business logic — propose extracting to a service.
- Speculative `React.memo` without a downstream consumer that needs stable refs.

## 5. UX / a11y (only if `apps/web/` changed)

- New interactive elements have a visible focus state.
- Icons are `aria-hidden` (decorative) or have a label (meaningful).
- Form controls have associated `<label>` elements.
- Sufficient contrast (slate-700+ on white, white on brand-600+).

## 6. Verification

If the change is UI-visible: suggest the user run `npm run dev` and exercise the affected flow.
If the change touches the API: suggest a `curl` against the endpoint with both a valid and malformed input.

## 7. Report

```text
🟢 Good
- <bullet>

🟡 Questionable
- <file:line> — <issue> — <suggested fix>

🔴 Blocking
- <file:line> — <issue> — <required fix>

Recommendation: APPROVE | REQUEST_CHANGES | NEEDS_DISCUSSION
```

Be specific. Cite file:line. "Looks fine" is not a review.

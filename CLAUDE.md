# CLAUDE.md — instructions for AI assistants

> Loaded into every Claude Code session opened in this repo. Defines team expectations for AI-assisted work.

The companion file `CLAUDE.local.md` is **gitignored** — use it for personal overrides without affecting teammates.

---

## 1. What this project is

**Atlas Insights** is an Nx monorepo containing:

- `apps/web` — a React + TypeScript dashboard visualizing USGS earthquake data.
- `apps/api` — a NestJS caching & security API in front of the public USGS feed.
- `libs/shared-types` — the canonical wire contract (`EarthquakeRecord`, response envelopes).
- `libs/shared-utils` — the CSV parser and sanitization helpers, used by both apps.

It serves both as a working dashboard and as a reference for how the team thinks about:

- Layered React state management (props / Context / Zustand) backed by TanStack Query.
- A small, well-secured NestJS API with caching, throttling, validation, and sanitization.
- End-to-end type safety across the monorepo via shared libs.

If you are an AI assistant reading this: **the architecture is intentional**. Before refactoring across module or app boundaries, read `INTERVIEWER.md` §2 and `.claude/rules/architecture.md`.

---

## 2. Tech stack (do not swap silently)

### Workspace

- **Nx 19** (npm workspaces under the hood, `nx:run-commands` executors).
- **TypeScript 5 strict** — single `tsconfig.base.json` at the root; each project extends it.
- **ESLint + Prettier** with a zero-warning policy.

### `apps/web`

- **React 18 + Vite 5** — no class components except `ErrorBoundary`.
- **Tailwind CSS** — no CSS Modules, no styled-components.
- **Zustand** (UI state) + **React Context** (resolved selection) + **TanStack Query** (server state) + props (presentational).
- **TanStack Table + Virtual** for the data table.
- **Recharts** for the scatter chart.
- **PapaParse** for the CSV fallback path.

### `apps/api`

- **NestJS 10** with `@nestjs/config`, `@nestjs/cache-manager`, `@nestjs/throttler`.
- **helmet** for security headers, **compression** for gzip.
- **class-validator + class-transformer** for DTOs and env schema.
- **undici** for upstream HTTP with hard timeouts.

Adding a new dependency requires explicit justification in the PR description. Bias toward solving with what's already installed.

---

## 3. Workspace conventions

### Project boundaries

- `apps/web` may import from `libs/shared-types` and `libs/shared-utils`. Nothing else cross-cuts.
- `apps/api` may import from `libs/shared-types` and `libs/shared-utils`. Nothing else cross-cuts.
- `apps/web` and `apps/api` **never** import from each other directly. The wire format in `libs/shared-types` is their only contract.
- `libs/*` may not import from `apps/*`. Ever.

### Module paths

- `@atlas/shared-types`, `@atlas/shared-utils` — resolve via tsconfig paths + Vite alias.
- `@/*` — app-local alias resolving to that app's `src/`.
- Never use `../../../`.

### Adding a new lib

1. `libs/<name>/{src/index.ts, package.json, project.json, tsconfig.json}`.
2. Add path to `tsconfig.base.json` and to each consuming app's tsconfig + Vite alias.
3. Document the boundary in `.claude/rules/architecture.md`.

---

## 4. Coding conventions

### TypeScript

- `any` is a lint error. Use `unknown` and narrow.
- Domain types live in `libs/shared-types`. Don't redeclare them.
- Prefer `interface SomethingProps` for component props; `interface` for object shapes, `type` for unions / mapped types.
- Use `readonly` on array/record props that the component or function doesn't mutate.

### React (`apps/web`)

- Functional components only. The single class is `ErrorBoundary`.
- Custom hooks start with `use` and live in `src/hooks/`.
- `React.memo` only on components that (a) are expensive and (b) receive stable props.
- `useMemo` / `useCallback` only when there's a downstream `memo` that benefits from the stable reference, or the computation is genuinely expensive.

### NestJS (`apps/api`)

- One module per feature folder (`earthquakes/`, `health/`).
- Controllers stay thin — wire incoming request → DTO → service. No business logic.
- Services own caching, upstream calls, transformations.
- Cross-cutting concerns (logging, exception handling, throttling) are wired in `app.module.ts`, not sprinkled per-controller.
- DTOs use `class-validator` decorators. Trust the global `ValidationPipe` — don't re-validate inside controllers.
- Never construct an `Error.message` from user input without sanitizing — log injection is real.

### State (FE)

- **Props** for parent → presentational child.
- **Context** for resolved, structured values consumed by distant subtrees.
- **Zustand** for high-frequency UI state or anything that needs to bypass the React tree.
- **TanStack Query** for anything that came from a network call. Never store server data in Zustand.

### Styling

- Tailwind utilities, ordered roughly: layout → box → typography → color → state → responsive.
- Avoid arbitrary values (`text-[#abc]`) — add a token to `apps/web/tailwind.config.js` instead.
- All colors come from the design token palette (`brand-*`, slate, semantic).

---

## 5. Workflow expectations

### Before writing code

1. Read the relevant file(s) end-to-end. Most components/services have a docblock explaining intent.
2. If touching a cross-app boundary, read `INTERVIEWER.md` §2 + `.claude/rules/architecture.md`.
3. If touching anything in `apps/api` that handles input, also read `SECURITY.md`.

### While writing code

- Make the smallest change that solves the problem.
- Add a one-line `// Why: …` comment when the reason would surprise a reader. Don't comment WHAT — the code already says that.
- Don't add error handling for impossible cases. Trust internal invariants.
- Don't add backwards-compat shims when changing internal APIs — just update the call sites.

### Before reporting "done"

- `npm run typecheck` (root) — must pass for both apps.
- `npm run lint` (root) — zero warnings across both apps.
- For UI changes: actually open the browser and try the feature.
- For API changes: hit the endpoint with `curl` and verify a malformed input returns 400.

---

## 6. What NOT to do

- Don't add Redux, Recoil, Jotai, MobX, or any additional state library.
- Don't replace Tailwind with another styling solution.
- Don't add a UI kit (MUI, Chakra, shadcn) without explicit approval.
- Don't merge filter state into the Context, or selection state out of it. See `INTERVIEWER.md` §2.
- Don't blanket-wrap components in `React.memo`.
- Don't disable lint rules to silence a warning. Fix the underlying issue.
- Don't commit `.env` or anything in `CLAUDE.local.md` to git.
- Don't import from `apps/api` inside `apps/web` (or vice versa). Use `libs/shared-types` for the contract.
- Don't store server data in Zustand. That's what TanStack Query is for.
- Don't add a new dependency without justifying it in the PR description.
- Don't log request/response bodies in the API — even on public data, the discipline matters.

---

## 7. Useful commands

### Root

```bash
npm install          # install workspace + both apps + both libs
npm run dev          # boot both apps in parallel
npm run dev:web      # FE only
npm run dev:api      # API only
npm run build        # API then web, type-check first
npm run typecheck    # both apps
npm run lint         # both apps, zero-warnings
npm run format       # Prettier write
npm run graph        # Nx project graph in your browser
```

### Per-app

```bash
cd apps/web && npm run dev
cd apps/api && npm run start:dev
```

---

## 8. Folder-level cheat sheet

### `apps/web/src/`

- `api/` — network entry points. **No hooks.** Plain async functions.
- `hooks/` — React hooks: data, derivations, store wrappers.
- `store/` — Zustand stores. One per domain.
- `context/` — React Contexts + their accessor hooks.
- `components/<feature>/` — feature-scoped components.
- `components/ui/` — headless primitives. **No business logic.**
- `utils/` — pure functions only.
- `pages/` — top-level composition. Thin, declarative.
- `providers/` — root-level providers (Query client, error boundary).

### `apps/api/src/`

- `main.ts` — bootstrap + global middleware.
- `app.module.ts` — root module wiring.
- `config/` — env schema validation.
- `common/` — cross-cutting (filters, interceptors, guards, middleware).
- `<feature>/` — module, controller, service, DTOs.

### `libs/`

- `shared-types/` — zero-runtime-dep type-only package.
- `shared-utils/` — pure functions safe to import from any runtime.

---

## 9. The `.claude/` folder

This repo ships its own [`.claude/`](./.claude/) configuration that refines AI behavior — slash commands, modular rule files, agent personas, skills. Read it before deviating from the conventions above.

# Code style

## TypeScript (all projects)

- `strict: true` is non-negotiable. Extends from `tsconfig.base.json`.
- `any` is a lint error. Use `unknown` and narrow.
- Domain types live in `libs/shared-types`. Don't redeclare them.
- Prefer `interface SomethingProps` for component props.
- Use `readonly` on array / record props that aren't mutated.

## React (`apps/web`)

- Functional components only. The single class is `ErrorBoundary` — leave it alone.
- One default export per page; otherwise named exports.
- Custom hooks start with `use`. Put them in `src/hooks/`.
- `React.memo` only on components that (a) are expensive and (b) receive stable props.
- `useMemo` / `useCallback` only when there's a downstream `memo` that needs the stable reference, or the computation is genuinely expensive.

## NestJS (`apps/api`)

- One module per feature folder. Module → controller → service → DTO.
- Controllers stay thin. Wire DTO → service → response. No business logic.
- DTOs use `class-validator` decorators. Trust the global `ValidationPipe` — don't re-validate inside controllers or services.
- Services own caching, upstream calls, transformations.
- Cross-cutting concerns (logging, exception handling, throttling) belong in `app.module.ts`, not per-controller.
- `process.env.*` reads belong in `config/env.validation.ts` and `main.ts` only. Inject `ConfigService` everywhere else.
- Use `Logger`, never raw `console.log`.

## File organization

- ≤ 200 lines per file. If you cross that, the right move is usually to extract a presentational child, not a helper.
- Path aliases:
  - `@atlas/shared-types`, `@atlas/shared-utils` — across the monorepo.
  - `@/*` — app-local alias resolving to that app's `src/`.
- Never write `../../../`.
- Co-locate small helpers next to the only consumer. Promote to a shared lib only when a second consumer appears in a different app.

## Naming

- Components: PascalCase.
- Hooks: `useFooBar`.
- Stores: `useFooStore`.
- Contexts: `FooContext` + `useFoo` accessor + `FooProvider` component.
- NestJS modules / controllers / services: `FooModule`, `FooController`, `FooService`.
- DTOs: `FooQueryDto`, `FooBodyDto`, `FooResponseDto`.
- Types & interfaces: PascalCase, no `I` prefix.

## Comments

- Default to none.
- When you write one, explain the **WHY**, not the WHAT. The code already says the WHAT.
- Docblocks on hooks, stores, contexts, NestJS services, and DTOs: encouraged. These are entry points and benefit from a sentence of intent.
- API services should also document the **caching / TTL / retry / security** rationale in their docblocks.

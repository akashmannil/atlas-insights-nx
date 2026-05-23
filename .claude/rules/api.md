# API conventions

For anything under `apps/api/`. Read [`SECURITY.md`](../../SECURITY.md) before editing anything in this directory.

## Module structure

- One folder per feature: `<feature>/{module,controller,service}.ts` + `dto/`.
- Controllers stay thin. They wire DTO → service → response. No business logic.
- Services own caching, upstream calls, and transformations.
- DTOs use `class-validator` decorators. Don't re-validate inside controllers or services — the global `ValidationPipe` already ran.

## Security defaults

These are **on by default**. If you remove or relax any of them, document why in the PR description and have a second pair of eyes review:

- `helmet()` with tightened CSP (`default-src 'none'`).
- Global `ValidationPipe({whitelist: true, forbidNonWhitelisted: true, transform: true})`.
- Global `ThrottlerGuard` registered as `APP_GUARD`.
- CORS allowlist from env, methods restricted to `GET`, `credentials: false`.
- `app.set('trust proxy', 1)` — never `true`.
- Global `HttpExceptionFilter` — returns a sanitized envelope, no stack traces to clients.
- `LoggingInterceptor` — strips CR/LF from URLs and IPs; never logs bodies.

## Adding a new endpoint

1. **Define a DTO** with `class-validator` decorators on every accepted field. Bound every numeric range. Constrain every string with `@Length` and `@Matches` where realistic.
2. **Throttle deliberately.** Inherit the global default, or use `@Throttle({...})` to tighten on heavy routes. Use `@SkipThrottle()` only for health probes.
3. **Set `Cache-Control`** if appropriate — most reads are public and benefit from short HTTP cache.
4. **Never log untrusted strings without `sanitize()`** — log injection via CR/LF is the easiest mistake to make.
5. **Wrap upstream calls in `undici.request` with `bodyTimeout` and `headersTimeout`**. A slow upstream must not tie up workers.
6. **Surface upstream failure as `ServiceUnavailableException`** (503) with a generic message. Detail goes to logs, not clients.

## Adding a new env var

1. Add it to `apps/api/src/config/env.validation.ts` with a `class-validator` decorator that bounds the value.
2. Add it to `.env.example` with a comment explaining what it does.
3. Document it in `apps/api/README.md` if you add one, or in the table inside `SECURITY.md` if security-relevant.

## Sanitization

Untrusted strings from upstream feeds flow through `sanitizePlace()` (in `libs/shared-utils/src/sanitize.ts`) at the **ingestion boundary** — before the cache, before the API response, before logs.

If you accept new free-text input from upstream, add a sanitizer alongside `sanitizePlace`. Don't sprinkle inline `.replace()` calls — they rot.

## What's intentionally NOT here

- No database. No auth. No mutations. If you find yourself adding any of these, stop and propose the change in a PR description first — they're significant architecture shifts.
- No raw `console.log`. Use `Logger`.
- No `process.env.*` reads outside `env.validation.ts` and `main.ts`. Inject `ConfigService` everywhere else.

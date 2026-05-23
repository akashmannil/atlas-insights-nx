# Security posture

Atlas Insights is a public-data dashboard with no authenticated user surface, but it's built with the same security discipline a real product should ship with. This file documents the controls actually in place.

---

## 1. Threat model

| Asset                               | Threat                                                                  | Control                                                                                                       |
| ----------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| API availability                    | DoS via cache-busting query parameters, brute force, scraping           | `@nestjs/throttler` per-IP rate limit, in-flight upstream de-duplication, hard upstream timeout, body size cap |
| API integrity                       | Mass-assignment, malformed query bypass                                 | Global `ValidationPipe({whitelist, forbidNonWhitelisted})`, strict DTO with `class-validator`                  |
| Cross-origin abuse                  | Browser CSRF / cross-origin data theft                                  | CORS allowlist from env (never `*`), no credentials, `GET`-only methods                                       |
| Header-based attacks                | XSS, clickjacking, MIME sniffing, HSTS downgrade                        | `helmet()` with tightened CSP (no script-src — API serves no HTML), `frameAncestors 'none'`, `X-Content-Type-Options` |
| Untrusted upstream data             | Embedded HTML / control chars in place names → XSS, log injection       | `sanitizePlace` strips control chars and tags at the **ingestion boundary**, before caching or returning      |
| Information disclosure              | Stack traces / Express defaults leaking implementation                  | Global `HttpExceptionFilter` returns sanitized envelope; full stack only in server logs for 5xx               |
| Log integrity                       | CR/LF injection in URLs / IPs                                           | `LoggingInterceptor` strips CR/LF and caps length before writing                                              |
| Reverse-proxy spoofing              | Forged `X-Forwarded-For` to bypass rate limit                           | `app.set('trust proxy', 1)` — trusts exactly one hop                                                          |
| Secret leakage                      | `.env` committed to git                                                 | `.gitignore` excludes `.env*.local` and `.env`; only `.env.example` is tracked                                |
| Supply chain                        | Compromised transitive dependencies                                     | Minimal dependency surface (11 runtime deps in FE, 12 in API), all from well-maintained sources               |

---

## 2. Frontend controls

- **React JSX auto-escaping** for every interpolated string. No `dangerouslySetInnerHTML` anywhere.
- **Strict TypeScript** (`strict`, `noUncheckedIndexedAccess`, `noImplicitAny`) eliminates whole classes of nil-deref and type-confusion bugs.
- **`@typescript-eslint/no-explicit-any: 'error'`** — `any` is a build break, not a warning.
- **Defensive CSV parsing** in `libs/shared-utils/src/csv.ts`: hand-picked fields, manual numeric coercion (`null`, not `NaN`), bounded field lengths.
- **No third-party analytics, no third-party fonts loaded at runtime** (Google Fonts is preconnected but optional).
- **No service worker / no localStorage of sensitive data** — there is none.

---

## 3. API controls (NestJS)

### 3.1 Middleware stack (applied in this order)

1. `helmet()` — security headers (CSP, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, Referrer-Policy).
2. `compression()` — gzip responses (defense against bandwidth amplification is not the goal; payload-size limits at the controller layer handle that).
3. CORS allowlist — env-driven, methods restricted to `GET`, `credentials: false`.
4. Global `ValidationPipe` — whitelisted DTO properties only.
5. Global `ThrottlerGuard` — per-IP rate limit (default 60 req / 60 s, tightened to 30/min on `/earthquakes`).
6. Global `LoggingInterceptor` — sanitized structured logs.
7. Global `HttpExceptionFilter` — uniform error envelope.

### 3.2 Validation

`EarthquakesQueryDto` constrains every query parameter:

| Field          | Constraint                                                                       |
| -------------- | -------------------------------------------------------------------------------- |
| `minMagnitude` | int, 0 ≤ n ≤ 10                                                                  |
| `limit`        | int, 1 ≤ n ≤ 10 000                                                              |
| `search`       | string, 1–64 chars, regex `/^[\p{L}\p{N}\s,.\-']+$/u` (printable, no control chars) |
| `tsunamiOnly`  | strict boolean                                                                   |

Unknown query keys → 400. Malformed values → 400. No silent coercion of garbage to defaults.

### 3.3 Sanitization

Place-name strings flow from an untrusted upstream feed → cache → API → client. They are sanitized **once** at the ingestion boundary (`libs/shared-utils/src/sanitize.ts`):

- Strip ASCII control characters (`\x00–\x1F`, `\x7F`).
- Strip any HTML-tag-like sequences.
- Trim and length-cap at 200 chars.

This is defense in depth — React already escapes text on render — but means the same sanitized values are safe for logs, NDJSON exports, and any future server-rendered surface.

### 3.4 Rate limiting

- Default: 60 req / 60 s per IP, globally enforced by `APP_GUARD`.
- `/api/earthquakes`: tightened to 30 req / 60 s — it's the most expensive route.
- `/api/health`: exempt (`@SkipThrottle()`) so probes don't compete for budget.
- Trust-proxy is set to `1` — XFF spoofing requires breaking the reverse proxy itself.

### 3.5 Upstream isolation

- Single shared in-flight promise prevents thundering-herd amplification.
- `undici.request` with explicit `bodyTimeout` and `headersTimeout` — a slow upstream cannot tie up workers indefinitely.
- Upstream failure → `503 ServiceUnavailableException` with a generic message; the URL/error detail stays in server logs.

### 3.6 Pagination + caching as defense

The cursor pagination contract was designed with abuse-resistance in mind:

- `cursor` is bounded (`0 ≤ n ≤ 1_000_000`) — a hostile caller can't `?cursor=Number.MAX_SAFE_INTEGER` to waste a worker on `array.slice()` past the end.
- `limit` is bounded (`1 ≤ n ≤ 10_000`) — caps the per-request work.
- Pagination operates on the **already-cached** parsed dataset; cache-busting query variation (e.g. random `?_=timestamp`) can't force re-parsing because the cache key is fixed.
- Weak `ETag` derived from `(datasetVersion, query)` means re-requesting the same page returns `304` with no body — a hostile reloader can't even amplify bandwidth.
- The dataset cache key is constant; no per-request keys are written. This rules out a "fill the cache with garbage to evict legitimate entries" attack.

### 3.6 Configuration

- `class-validator`-validated env schema. Boot fails loudly on missing/malformed values — never silently at request time.
- `USGS_FEED_URL` is asserted to be HTTPS.

---

## 4. What is NOT in scope

- **Authentication / authorization** — there is no user surface to protect.
- **WAF / CDN-level DDoS** — would be the deployment platform's job (CloudFront, Cloudflare, etc.). The API's rate limiter only protects against application-layer abuse.
- **Audit log persistence** — logs go to stdout. A production deploy would forward them to a structured-log backend (Loki, Datadog, etc.).
- **Encrypted storage** — there is no storage. Cache is in-memory only.
- **Pen-test scope** — this is a portfolio piece. A production deployment would warrant a third-party pentest before going live.

---

## 5. Reporting a vulnerability

If you find an issue, please open a private security advisory on the repo (or email the address in `README.md`) rather than filing a public issue.

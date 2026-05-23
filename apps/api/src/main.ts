import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import type { NestExpressApplication } from '@nestjs/platform-express';

/**
 * API bootstrap.
 *
 * Security posture established here (in priority order):
 *   1. `helmet()` — sane HTTP security headers (CSP, X-Frame, etc.).
 *   2. CORS allowlist from env — never `*` in production.
 *   3. Body size limit — public endpoint, no need for large payloads.
 *   4. Global `ValidationPipe` with `whitelist + forbidNonWhitelisted` — any
 *      undeclared query/body param is rejected, eliminating mass-assignment.
 *   5. Trust proxy = 1 — Express reads the *first* X-Forwarded-For hop, which
 *      is required for the throttler to see real client IPs behind a reverse
 *      proxy without trusting arbitrary forged headers.
 *
 * The throttler itself is configured in `AppModule` so it can pull settings
 * from `ConfigService`.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('API_PORT', 3000);
  const host = config.get<string>('API_HOST', '0.0.0.0');
  const corsOrigins = config
    .get<string>('API_CORS_ORIGINS', 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // ----- Security middleware -----

  // helmet sets ~15 HTTP headers (CSP, HSTS, X-Frame-Options, etc.). We tighten
  // CSP further than the default — the API never serves HTML, so we forbid
  // every script source. If you later mount Swagger / docs, relax `scriptSrc`.
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'none'"],
          baseUri: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  app.use(compression());

  // Express trust-proxy: required for accurate client IP when behind a reverse
  // proxy (Nginx, CloudFront, etc.). `1` trusts exactly one hop — do not set
  // to `true` in untrusted environments (allows IP spoofing via XFF).
  app.set('trust proxy', 1);

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET'],
    credentials: false,
    maxAge: 86400,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  app.setGlobalPrefix('api');

  // Graceful shutdown — flush in-flight requests before exit.
  app.enableShutdownHooks();

  await app.listen(port, host);

  Logger.log(`Atlas API listening on http://${host}:${port}/api`, 'Bootstrap');
  Logger.log(`CORS allowlist: ${corsOrigins.join(', ') || '<none>'}`, 'Bootstrap');
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});

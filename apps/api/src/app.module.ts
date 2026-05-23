import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EarthquakesModule } from './earthquakes/earthquakes.module';
import { HealthModule } from './health/health.module';
import { validateEnv } from './config/env.validation';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

/**
 * Root module wires together cross-cutting concerns:
 *
 *   - **ConfigModule** loads `.env` (workspace root + app-local) and runs the
 *     `validateEnv` schema. Missing/malformed env vars crash bootstrap loudly
 *     instead of failing at runtime.
 *
 *   - **CacheModule** is registered globally so any module can `@Inject(CACHE_MANAGER)`.
 *     The earthquakes service uses it to memoize the parsed USGS payload.
 *
 *   - **ThrottlerModule** rate-limits per-IP. Tuned via env so different
 *     deployment environments can tighten/loosen without code changes.
 *     Registered globally as a `APP_GUARD` so every route is protected by
 *     default — opt-out is explicit (`@SkipThrottle()`).
 *
 *   - **LoggingInterceptor** is a global interceptor — gives us structured
 *     request/response logs (method, path, status, duration). Stops short of
 *     logging bodies to avoid accidental PII leakage.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Workspace-root .env is loaded first; an app-local .env can override.
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
      cache: true,
    }),
    CacheModule.register({
      isGlobal: true,
      // TTL is set per-key in the service so it can pull from ConfigService.
      max: 16,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_WINDOW_SECONDS', 60) * 1000,
          limit: config.get<number>('THROTTLE_LIMIT', 60),
        },
      ],
    }),
    EarthquakesModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}

import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { HealthResponse } from '@atlas/shared-types';
import { EarthquakesService } from '../earthquakes/earthquakes.service';

/**
 * Liveness + readiness in one endpoint.
 *
 * `SkipThrottle()` because health probes (Kubernetes, uptime monitors) call
 * this on a tight interval and shouldn't share a rate budget with real
 * traffic. Safe to bypass — the response is constant-time and reveals
 * nothing sensitive.
 */
@Controller('health')
@SkipThrottle()
export class HealthController {
  private readonly startedAt = Date.now();

  constructor(private readonly earthquakes: EarthquakesService) {}

  @Get()
  check(): HealthResponse {
    const cache = this.earthquakes.getCacheState();
    return {
      status: 'ok',
      uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
      cache,
    };
  }
}

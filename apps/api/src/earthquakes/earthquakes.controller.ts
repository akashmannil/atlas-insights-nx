import { Controller, Get, Headers, HttpStatus, Query, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { type EarthquakesQueryDto } from './dto/earthquakes-query.dto';
import { type EarthquakesService } from './earthquakes.service';

/**
 * Public read-only endpoints for the dashboard.
 *
 * HTTP caching strategy (on top of the service-level in-memory cache):
 *
 *   - `Cache-Control: public, max-age=60, s-maxage=120` — browsers and CDNs
 *     keep their own short copy.
 *   - `ETag` is computed from the dataset version + query params. On reload
 *     the client sends `If-None-Match`; matching → `304 Not Modified` with
 *     an empty body. This is the single biggest perf win for page-by-page
 *     fetches: a re-request costs ~200 bytes of headers and zero JSON.
 *
 * We use `@Res()` without `passthrough` so the response lifecycle is fully
 * under our control — the alternative (`passthrough: true` + manual `.end()`)
 * race-conditions with Nest's serializer.
 */
@Controller('earthquakes')
export class EarthquakesController {
  constructor(private readonly service: EarthquakesService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async list(
    @Query() query: EarthquakesQueryDto,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    // Compute ETag *before* slicing — depends only on dataset version + query
    // inputs, so a 304 short-circuits the slice work entirely.
    const etag = this.service.computeListEtag(query);
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120');
    res.setHeader('ETag', etag);

    if (ifNoneMatch === etag) {
      res.status(HttpStatus.NOT_MODIFIED).end();
      return;
    }

    const body = await this.service.list(query);
    res.status(HttpStatus.OK).json(body);
  }

  @Get('stats')
  async stats(
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const etag = this.service.computeStatsEtag();
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120');
    res.setHeader('ETag', etag);

    if (ifNoneMatch === etag) {
      res.status(HttpStatus.NOT_MODIFIED).end();
      return;
    }

    const body = await this.service.stats();
    res.status(HttpStatus.OK).json(body);
  }
}

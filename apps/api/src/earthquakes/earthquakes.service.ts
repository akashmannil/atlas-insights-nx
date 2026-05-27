import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { type ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';
import { createHash } from 'node:crypto';
import { request } from 'undici';
import { parseEarthquakeCsv } from '@atlas/shared-utils';
import type {
  EarthquakeListResponse,
  EarthquakeRecord,
  EarthquakeStatsResponse,
} from '@atlas/shared-types';
import type { EarthquakesQueryDto } from './dto/earthquakes-query.dto';

/**
 * Owns the upstream fetch, in-memory cache, slicing, and stats projection.
 *
 * Caching strategy (two layers, both keyed off the parsed dataset):
 *
 *   1. **Dataset cache** — single key `earthquakes:all-month` holds the full
 *      parsed array. TTL configurable (default 5 min). Pagination is just
 *      `array.slice(cursor, cursor+limit)` — a page request never re-parses
 *      and almost never re-fetches.
 *
 *   2. **ETag** — a stable hash of the dataset version + the request's
 *      filter/page params. The controller compares this to `If-None-Match`
 *      and short-circuits with 304 when the client's copy is current. This
 *      means *zero JSON body bytes* go over the wire on a re-load until the
 *      cache TTL expires upstream.
 *
 * Stampede prevention: one shared promise across concurrent cache-misses.
 * A burst of cold-cache requests triggers exactly one upstream call.
 */
@Injectable()
export class EarthquakesService {
  private readonly logger = new Logger(EarthquakesService.name);

  private static readonly CACHE_KEY = 'earthquakes:all-month';
  private static readonly FETCH_TIMEOUT_MS = 15_000;
  /** Default page size when `limit` is omitted but `cursor` is set. */
  private static readonly DEFAULT_PAGE_SIZE = 500;

  private inflight: Promise<EarthquakeRecord[]> | null = null;
  private lastFetchAt: number | null = null;
  /**
   * Monotonically-bumped version stamp folded into ETag computation. Bumps
   * on every successful upstream fetch — guarantees the ETag changes even
   * if two snapshots happen to hash identically.
   */
  private datasetVersion = 0;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly config: ConfigService,
  ) {}

  async list(query: EarthquakesQueryDto): Promise<EarthquakeListResponse> {
    const { records, cached } = await this.getRecords();
    const filtered = this.applyFilters(records, query);
    const total = filtered.length;

    // Two pagination modes:
    //   - `cursor` set → strict pagination: slice(cursor, cursor+limit).
    //   - `cursor` omitted → legacy "limit-from-top" semantics so older
    //     clients keep working unchanged.
    const cursor = query.cursor ?? 0;
    const pageSize = query.limit ?? (query.cursor !== undefined
      ? EarthquakesService.DEFAULT_PAGE_SIZE
      : total);

    const sliced = filtered.slice(cursor, cursor + pageSize);
    const nextOffset = cursor + sliced.length;
    const nextCursor = nextOffset < total ? nextOffset : null;

    return {
      data: sliced,
      meta: {
        generatedAt: Date.now(),
        count: sliced.length,
        total,
        cursor,
        nextCursor,
        cached,
      },
    };
  }

  /**
   * Compute a stable, content-addressable ETag for a list response.
   *
   * Inputs:
   *   - `datasetVersion` — bumps on each upstream fetch, guarantees freshness.
   *   - Query params that actually affect the response body.
   *
   * Output is a quoted weak ETag so HTTP proxies treat it correctly even if
   * gzip changes byte-for-byte equality.
   */
  computeListEtag(query: EarthquakesQueryDto): string {
    const key = JSON.stringify({
      v: this.datasetVersion,
      minMag: query.minMagnitude ?? null,
      limit: query.limit ?? null,
      cursor: query.cursor ?? null,
      search: query.search ?? null,
      tsu: query.tsunamiOnly ?? null,
    });
    const hash = createHash('sha1').update(key).digest('base64url').slice(0, 16);
    return `W/"eq-${hash}"`;
  }

  async stats(): Promise<EarthquakeStatsResponse> {
    const { records } = await this.getRecords();

    let magSum = 0;
    let magCount = 0;
    let maxMag: number | null = null;
    let tsunamiCount = 0;
    let significantCount = 0;
    const SIGNIFICANT_THRESHOLD = 600;

    for (const r of records) {
      if (r.magnitude !== null) {
        magSum += r.magnitude;
        magCount += 1;
        if (maxMag === null || r.magnitude > maxMag) maxMag = r.magnitude;
      }
      if (r.tsunami === 1) tsunamiCount += 1;
      if ((r.significance ?? 0) >= SIGNIFICANT_THRESHOLD) significantCount += 1;
    }

    return {
      count: records.length,
      averageMagnitude: magCount > 0 ? magSum / magCount : null,
      maxMagnitude: maxMag,
      tsunamiCount,
      significantCount,
      generatedAt: Date.now(),
    };
  }

  /** Stable hash of the parsed dataset — used by the stats ETag. */
  computeStatsEtag(): string {
    return `W/"st-${this.datasetVersion}"`;
  }

  getCacheState(): { populated: boolean; ageMs: number | null } {
    return {
      populated: this.lastFetchAt !== null,
      ageMs: this.lastFetchAt === null ? null : Date.now() - this.lastFetchAt,
    };
  }

  // ---------- internals ----------

  private async getRecords(): Promise<{ records: EarthquakeRecord[]; cached: boolean }> {
    const hit = await this.cache.get<EarthquakeRecord[]>(EarthquakesService.CACHE_KEY);
    if (hit) return { records: hit, cached: true };

    if (!this.inflight) {
      this.inflight = this.fetchAndCache().finally(() => {
        this.inflight = null;
      });
    }

    const records = await this.inflight;
    return { records, cached: false };
  }

  private async fetchAndCache(): Promise<EarthquakeRecord[]> {
    const url = this.config.get<string>('USGS_FEED_URL', '');
    const ttlSeconds = this.config.get<number>('CACHE_TTL_SECONDS', 300);

    this.logger.log(`Fetching upstream USGS feed (${url})`);

    let csv: string;
    try {
      const response = await request(url, {
        method: 'GET',
        headers: { accept: 'text/csv', 'user-agent': 'atlas-insights/1.0 (+nestjs)' },
        bodyTimeout: EarthquakesService.FETCH_TIMEOUT_MS,
        headersTimeout: EarthquakesService.FETCH_TIMEOUT_MS,
      });

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(`upstream HTTP ${response.statusCode}`);
      }
      csv = await response.body.text();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`USGS fetch failed: ${message}`);
      throw new ServiceUnavailableException('Upstream feed unavailable. Please retry shortly.');
    }

    if (!csv.trim()) {
      throw new ServiceUnavailableException('Upstream feed returned an empty response.');
    }

    const records = parseEarthquakeCsv(csv);
    await this.cache.set(EarthquakesService.CACHE_KEY, records, ttlSeconds * 1000);
    this.lastFetchAt = Date.now();
    this.datasetVersion += 1;
    this.logger.log(
      `Cached ${records.length} earthquake records (ttl ${ttlSeconds}s, version ${this.datasetVersion})`,
    );
    return records;
  }

  private applyFilters(
    records: readonly EarthquakeRecord[],
    query: EarthquakesQueryDto,
  ): readonly EarthquakeRecord[] {
    if (!query.minMagnitude && !query.search && !query.tsunamiOnly) {
      return records;
    }

    const needle = query.search?.toLowerCase();
    const minMag = query.minMagnitude ?? 0;
    const tsunamiOnly = query.tsunamiOnly === true;

    return records.filter((r) => {
      if (tsunamiOnly && r.tsunami !== 1) return false;
      if (minMag > 0 && (r.magnitude ?? -Infinity) < minMag) return false;
      if (needle && !r.place.toLowerCase().includes(needle)) return false;
      return true;
    });
  }
}

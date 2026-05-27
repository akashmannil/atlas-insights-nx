import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Query parameters for `GET /api/earthquakes`.
 *
 * The endpoint is intentionally a pagination-only surface — record-level
 * filtering (magnitude / search / tsunami) happens client-side against the
 * loaded slice. Adding filter params here is an explicit design decision (see
 * `INTERVIEWER.md` §2): it would require filter-aware totals, ETag keys, and
 * debounced refetch on every keystroke. None of that is wired up, so the
 * surface stays narrow and the global `ValidationPipe({forbidNonWhitelisted})`
 * rejects any unknown filter param as 400.
 */
export class EarthquakesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  limit?: number;

  /**
   * 0-indexed offset into the cached dataset for cursor pagination.
   * Bounded so a hostile caller can't request `cursor=Number.MAX_SAFE_INTEGER`
   * and waste a service-tier worker on `array.slice()` past the end.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  cursor?: number;
}

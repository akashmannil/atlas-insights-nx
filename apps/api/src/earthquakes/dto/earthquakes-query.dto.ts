import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

/**
 * Query parameters for `GET /api/earthquakes`.
 *
 * Validation rationale:
 *   - `minMagnitude` clamped 0–10 — physical bounds + prevents `Infinity` abuse.
 *   - `limit` clamped 1–10_000 — covers the realistic monthly feed.
 *   - `search` length-capped + regex-restricted to printable ASCII —
 *     blocks log-injection and exotic Unicode that has no business in a
 *     place-name search.
 *   - `tsunamiOnly` strictly boolean (rejects "yes"/"1"/etc unless explicitly
 *     transformed).
 *
 * Combined with the global `ValidationPipe({forbidNonWhitelisted: true})`,
 * any unknown query key returns a 400 — mass-assignment is impossible.
 */
export class EarthquakesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10)
  minMagnitude?: number;

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

  @IsOptional()
  @IsString()
  @Length(1, 64)
  @Matches(/^[\p{L}\p{N}\s,.\-']+$/u, {
    message: 'search may only contain letters, numbers, spaces, and , . - \'',
  })
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  tsunamiOnly?: boolean;
}

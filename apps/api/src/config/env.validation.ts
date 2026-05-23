import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  validateSync,
} from 'class-validator';

/**
 * Strongly-typed env schema. Anything not listed here is unknown to the API.
 *
 * Validation runs once at bootstrap inside `ConfigModule.forRoot({ validate })`,
 * so a typo / missing value crashes the process at startup with a clear
 * message — never silently at request time.
 */
enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

class EnvSchema {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  API_PORT: number = 3000;

  @IsOptional()
  @IsString()
  API_HOST: string = '0.0.0.0';

  @IsOptional()
  @IsString()
  API_CORS_ORIGINS: string = 'http://localhost:5173';

  @IsUrl({ protocols: ['https'], require_protocol: true })
  USGS_FEED_URL: string = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.csv';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60 * 60)
  CACHE_TTL_SECONDS: number = 300;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  THROTTLE_LIMIT: number = 60;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3600)
  THROTTLE_WINDOW_SECONDS: number = 60;

  @IsOptional()
  @IsEnum(LogLevel)
  LOG_LEVEL: LogLevel = LogLevel.Info;
}

export const validateEnv = (raw: Record<string, unknown>): EnvSchema => {
  const parsed = plainToInstance(EnvSchema, raw, { enableImplicitConversion: true });
  const errors = validateSync(parsed, { skipMissingProperties: false });
  if (errors.length > 0) {
    const summary = errors
      .map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n  ');
    throw new Error(`Invalid environment configuration:\n  ${summary}`);
  }
  return parsed;
};

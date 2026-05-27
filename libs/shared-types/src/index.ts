/**
 * Shared domain model for the Atlas Insights monorepo.
 *
 * This package is the single source of truth for the `EarthquakeRecord` shape.
 * Both the web app and the NestJS API depend on it — keeping the contract
 * here prevents the two ends of the wire from drifting apart.
 *
 * Rule: **no runtime dependencies, no framework imports**. This package
 * should be safely importable from a browser bundle, a Node server, and
 * any future worker / edge runtime.
 */

/**
 * Canonical earthquake record after CSV → object normalization.
 *
 * Numeric fields are nullable when USGS omits a measurement — components
 * (or API consumers) must handle that explicitly rather than coercing to 0,
 * which would skew downstream statistics and scatter plots.
 */
export interface EarthquakeRecord {
  /** Unique USGS event id — used as the React key and selection token. */
  readonly id: string;
  /** Event origin time, parsed from ISO string into ms-since-epoch. */
  readonly time: number;
  /** Human-readable place description, e.g. "13 km NW of Anchorage, Alaska". */
  readonly place: string;
  readonly latitude: number;
  readonly longitude: number;
  /** Depth in kilometres; can be negative for events above mean sea level. */
  readonly depth: number | null;
  /** Moment magnitude (or equivalent). Null when undetermined. */
  readonly magnitude: number | null;
  /** USGS-reported significance score 0–1000+. */
  readonly significance: number | null;
  /** Number of "Did you feel it?" reports — sparse, often null. */
  readonly felt: number | null;
  /** 1 if a tsunami advisory was posted, 0 otherwise. */
  readonly tsunami: 0 | 1;
  /** Event type — earthquake, quarry blast, explosion, etc. */
  readonly type: string;
  /** Magnitude type code (md, ml, mw, etc.) — useful context in tooltips. */
  readonly magType: string | null;
}

/** Numeric fields eligible for plotting on either chart axis. */
export type NumericField =
  | 'magnitude'
  | 'depth'
  | 'latitude'
  | 'longitude'
  | 'significance'
  | 'felt';

export interface AxisOption {
  readonly value: NumericField;
  readonly label: string;
  /** Short unit suffix shown in axis labels and tooltips. */
  readonly unit?: string;
}

/**
 * Page size used by both the FE pagination caller and the API's default slice.
 * Single source of truth so the two ends never disagree.
 */
export const DEFAULT_PAGE_SIZE = 500;

export const AXIS_OPTIONS: readonly AxisOption[] = [
  { value: 'magnitude', label: 'Magnitude' },
  { value: 'depth', label: 'Depth', unit: 'km' },
  { value: 'latitude', label: 'Latitude', unit: '°' },
  { value: 'longitude', label: 'Longitude', unit: '°' },
  { value: 'significance', label: 'Significance' },
  { value: 'felt', label: 'Felt reports' },
] as const;

/**
 * API response envelope for `GET /api/earthquakes`. Keeping the records under
 * `data` (rather than at the root) lets us carry cursor pagination metadata
 * alongside the slice without breaking clients.
 *
 * Pagination model:
 *   - `cursor` is a 0-indexed offset into the cached dataset (simple and
 *     deterministic — we don't need opaque cursors because the source is a
 *     fully-loaded in-memory array).
 *   - `nextCursor` is `null` when the consumer has reached the end.
 *   - `total` is the full pre-filter dataset size, so the FE can render
 *     accurate "X of Y" progress without a separate count call.
 */
export interface EarthquakeListResponse {
  readonly data: readonly EarthquakeRecord[];
  readonly meta: {
    /** ms-since-epoch when the API cache produced this payload. */
    readonly generatedAt: number;
    /** Count of records included in *this* page. */
    readonly count: number;
    /** Total records in the cached upstream dataset (pre-filter). */
    readonly total: number;
    /** Offset of this page's first record. */
    readonly cursor: number;
    /** Offset to request next, or `null` if this was the last page. */
    readonly nextCursor: number | null;
    /** True when served from the API's in-memory cache (vs. fresh upstream fetch). */
    readonly cached: boolean;
  };
}

export interface EarthquakeStatsResponse {
  readonly count: number;
  readonly averageMagnitude: number | null;
  readonly maxMagnitude: number | null;
  readonly tsunamiCount: number;
  readonly significantCount: number;
  readonly generatedAt: number;
}

export interface HealthResponse {
  readonly status: 'ok' | 'degraded';
  readonly uptimeSec: number;
  readonly cache: {
    readonly populated: boolean;
    readonly ageMs: number | null;
  };
}

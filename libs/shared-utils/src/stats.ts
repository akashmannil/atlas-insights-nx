import type { EarthquakeRecord } from '@atlas/shared-types';

/**
 * Significance threshold above which an event is counted as "significant".
 * Lives next to the projection so the API, the FE stats hook, and the
 * sample-mode shim all agree on the cutoff.
 */
export const SIGNIFICANT_THRESHOLD = 600;

export interface EarthquakeStatsProjection {
  count: number;
  averageMagnitude: number | null;
  maxMagnitude: number | null;
  tsunamiCount: number;
  significantCount: number;
}

/**
 * Pure projection used by both the API stats endpoint and the FE sample-mode /
 * fallback paths. Kept in `shared-utils` so every consumer agrees on the
 * formula and the significance threshold — the previous duplication had four
 * copies that would drift the moment anyone tweaked one.
 */
export const computeEarthquakeStats = (
  records: readonly EarthquakeRecord[],
): EarthquakeStatsProjection => {
  let magSum = 0;
  let magCount = 0;
  let maxMagnitude: number | null = null;
  let tsunamiCount = 0;
  let significantCount = 0;

  for (const r of records) {
    if (r.magnitude !== null) {
      magSum += r.magnitude;
      magCount += 1;
      if (maxMagnitude === null || r.magnitude > maxMagnitude) maxMagnitude = r.magnitude;
    }
    if (r.tsunami === 1) tsunamiCount += 1;
    if ((r.significance ?? 0) >= SIGNIFICANT_THRESHOLD) significantCount += 1;
  }

  return {
    count: records.length,
    averageMagnitude: magCount > 0 ? magSum / magCount : null,
    maxMagnitude,
    tsunamiCount,
    significantCount,
  };
};

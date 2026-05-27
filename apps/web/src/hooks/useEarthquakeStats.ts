import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { EarthquakeRecord, EarthquakeStatsResponse } from '@atlas/shared-types';
import { computeEarthquakeStats, type EarthquakeStatsProjection } from '@atlas/shared-utils';
import { EARTHQUAKES_STATS_KEY, fetchEarthquakeStats } from '@/api/earthquakes';

const STALE_MS = Number(import.meta.env.VITE_QUERY_STALE_MS ?? 5 * 60 * 1000);

export type EarthquakeStats = EarthquakeStatsProjection;

const empty: EarthquakeStats = {
  count: 0,
  averageMagnitude: null,
  maxMagnitude: null,
  tsunamiCount: 0,
  significantCount: 0,
};

export interface UseEarthquakeStatsResult {
  /** Server-computed stats for the full dataset. */
  stats: EarthquakeStats;
  /** True until the stats endpoint resolves. */
  isLoading: boolean;
}

/**
 * Server-computed stats for the full dataset.
 *
 * Why a separate query instead of recomputing on the FE:
 *   - The stats endpoint returns ~80 bytes and resolves in parallel with the
 *     first paginated page — so the tiles render *before* the records do.
 *   - Recomputing client-side would require waiting for every page to arrive,
 *     defeating the point of pagination.
 *
 * `fallbackRecords` (optional): used during the very brief window before
 * the stats request resolves — we compute a quick estimate from whatever
 * pages have already loaded so the tiles aren't blank.
 */
export const useEarthquakeStats = (
  fallbackRecords: readonly EarthquakeRecord[] = [],
): UseEarthquakeStatsResult => {
  const query = useQuery<EarthquakeStatsResponse, Error>({
    queryKey: EARTHQUAKES_STATS_KEY,
    queryFn: ({ signal }) => fetchEarthquakeStats(signal),
    staleTime: STALE_MS,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const stats = useMemo<EarthquakeStats>(() => {
    if (query.data) {
      return {
        count: query.data.count,
        averageMagnitude: query.data.averageMagnitude,
        maxMagnitude: query.data.maxMagnitude,
        tsunamiCount: query.data.tsunamiCount,
        significantCount: query.data.significantCount,
      };
    }
    if (fallbackRecords.length === 0) return empty;
    return computeEarthquakeStats(fallbackRecords);
  }, [query.data, fallbackRecords]);

  return { stats, isLoading: query.isLoading && fallbackRecords.length === 0 };
};

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { computeEarthquakeStats, parseEarthquakeCsv } from '@atlas/shared-utils';
import type { EarthquakeListResponse, EarthquakeStatsResponse } from '@atlas/shared-types';
import { EARTHQUAKES_QUERY_KEY, EARTHQUAKES_STATS_KEY } from '@/api/earthquakes';

/**
 * Loads the bundled sample CSV into the TanStack Query cache, replacing live
 * data without touching any network requests. Calling `clearSample` invalidates
 * both caches so the next render triggers a fresh live fetch.
 */
export const useLoadSampleData = () => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isSampleMode, setIsSampleMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSample = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch('/sample.csv');
      if (!resp.ok) throw new Error(`Could not fetch sample CSV (${resp.status})`);
      const csv = await resp.text();
      const records = parseEarthquakeCsv(csv);

      const now = Date.now();
      const page: EarthquakeListResponse = {
        data: records,
        meta: { generatedAt: now, count: records.length, total: records.length, cursor: 0, nextCursor: null, cached: false },
      };

      queryClient.setQueryData<InfiniteData<EarthquakeListResponse>>(
        EARTHQUAKES_QUERY_KEY,
        { pages: [page], pageParams: [0] },
      );

      const stats: EarthquakeStatsResponse = {
        ...computeEarthquakeStats(records),
        generatedAt: now,
      };
      queryClient.setQueryData<EarthquakeStatsResponse>(EARTHQUAKES_STATS_KEY, stats);

      setIsSampleMode(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load sample data.';
      console.error('[sample] failed to load fixture data:', err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [queryClient]);

  const clearSample = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: EARTHQUAKES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: EARTHQUAKES_STATS_KEY });
    setIsSampleMode(false);
    setError(null);
  }, [queryClient]);

  const dismissError = useCallback(() => setError(null), []);

  return { loadSample, clearSample, isLoading, isSampleMode, error, dismissError };
};

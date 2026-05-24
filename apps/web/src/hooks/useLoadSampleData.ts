import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { parseEarthquakeCsv } from '@atlas/shared-utils';
import type { EarthquakeListResponse, EarthquakeStatsResponse } from '@atlas/shared-types';
import { EARTHQUAKES_QUERY_KEY, EARTHQUAKES_STATS_KEY } from '@/api/earthquakes';

const SIGNIFICANT_THRESHOLD = 600;

/**
 * Loads the bundled sample CSV into the TanStack Query cache, replacing live
 * data without touching any network requests. Calling `clearSample` invalidates
 * both caches so the next render triggers a fresh live fetch.
 */
export const useLoadSampleData = () => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isSampleMode, setIsSampleMode] = useState(false);

  const loadSample = useCallback(async () => {
    setIsLoading(true);
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

      let magSum = 0;
      let magCount = 0;
      let maxMag: number | null = null;
      let tsunamiCount = 0;
      let significantCount = 0;
      for (const r of records) {
        if (r.magnitude !== null) {
          magSum += r.magnitude;
          magCount += 1;
          if (maxMag === null || r.magnitude > maxMag) maxMag = r.magnitude;
        }
        if (r.tsunami === 1) tsunamiCount += 1;
        if ((r.significance ?? 0) >= SIGNIFICANT_THRESHOLD) significantCount += 1;
      }

      const stats: EarthquakeStatsResponse = {
        count: records.length,
        averageMagnitude: magCount > 0 ? magSum / magCount : null,
        maxMagnitude: maxMag,
        tsunamiCount,
        significantCount,
        generatedAt: now,
      };
      queryClient.setQueryData<EarthquakeStatsResponse>(EARTHQUAKES_STATS_KEY, stats);

      setIsSampleMode(true);
    } catch (err) {
      console.error('[sample] failed to load fixture data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [queryClient]);

  const clearSample = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: EARTHQUAKES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: EARTHQUAKES_STATS_KEY });
    setIsSampleMode(false);
  }, [queryClient]);

  return { loadSample, clearSample, isLoading, isSampleMode };
};

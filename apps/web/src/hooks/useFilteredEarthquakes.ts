import { useMemo } from 'react';
import { useEarthquakeStore } from '@/store/useEarthquakeStore';
import type { EarthquakeRecord } from '@atlas/shared-types';

/**
 * Applies user-controlled filters to the (possibly partially-loaded) dataset.
 *
 * Pulled into a hook so the chart, table, and stats fallback all consume the
 * *same* filtered slice. When pagination delivers more pages the memo re-runs
 * and the slice grows automatically.
 *
 * Each filter primitive is listed individually so unrelated state changes
 * (hover, axis swaps) don't trigger a recompute over thousands of rows.
 */
export const useFilteredEarthquakes = (
  records: readonly EarthquakeRecord[] | undefined,
): EarthquakeRecord[] => {
  const minMagnitude = useEarthquakeStore((s) => s.minMagnitude);
  const searchQuery = useEarthquakeStore((s) => s.searchQuery);
  const tsunamiOnly = useEarthquakeStore((s) => s.tsunamiOnly);

  return useMemo(() => {
    if (!records || records.length === 0) return [];

    const needle = searchQuery.trim().toLowerCase();
    // Fast path: no filters active, return the input array as-is. Skipping
    // the .filter() avoids a full O(n) walk + allocation on every keystroke.
    if (!needle && minMagnitude === 0 && !tsunamiOnly) return records as EarthquakeRecord[];

    return records.filter((r) => {
      if (tsunamiOnly && r.tsunami !== 1) return false;
      if (minMagnitude > 0 && (r.magnitude ?? -Infinity) < minMagnitude) return false;
      if (needle && !r.place.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [records, minMagnitude, searchQuery, tsunamiOnly]);
};

import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import type { EarthquakeListResponse, EarthquakeRecord } from '@atlas/shared-types';
import { EARTHQUAKES_QUERY_KEY, fetchEarthquakePage } from '@/api/earthquakes';

const STALE_MS = Number(import.meta.env.VITE_QUERY_STALE_MS ?? 5 * 60 * 1000);

export interface UseEarthquakesResult {
  /** Flat, accumulated record array from every page loaded so far. */
  records: EarthquakeRecord[];
  /** Total records available on the server (pre-pagination). */
  total: number;
  /** True until the first page resolves. */
  isLoading: boolean;
  /** True whenever a fetch is in flight (initial or subsequent page). */
  isFetching: boolean;
  /** True specifically while a `fetchNextPage()` is pending. */
  isFetchingNextPage: boolean;
  /** True once every page is loaded. */
  isComplete: boolean;
  isError: boolean;
  error: Error | null;
  /** True when the *first* page was served from the API's in-memory cache. */
  cachedByApi: boolean;
  /** Manually request the next page. Resolves when the page has landed (or immediately when there are no more pages). */
  fetchNextPage: () => Promise<void>;
  /** Discard cached pages and re-fetch from page 0. */
  refetch: () => void;
  /** Timestamp from the most recently returned page. */
  dataUpdatedAt: number;
}

/**
 * Infinite-paginated source of truth for the earthquake dataset.
 *
 * Why infinite query (and not `useQuery` over the full list):
 *   - The full month feed is multi-MB. A single fetch blocks first paint
 *     for seconds on slow connections.
 *   - Cursor pagination + a small first page (500 records) gives the user
 *     an interactive chart + table in ~200 ms, with the rest streaming in.
 *   - All pages share the same TanStack Query cache key, so HMR / nav back
 *     to the dashboard reuses what's already loaded.
 *
 * Auto-prefetch strategy:
 *   - We do not eagerly download every page on mount — the table virtualizer
 *     calls `fetchNextPage()` as the user scrolls near the bottom.
 *   - However, if the user is *not* scrolling, a single auto-prefetch after
 *     a short idle delay keeps the chart filling in. Without this the chart
 *     would stay stuck at page-1 density for users who never touch the table.
 */
export const useEarthquakes = (): UseEarthquakesResult => {
  const query = useInfiniteQuery<EarthquakeListResponse, Error>({
    queryKey: EARTHQUAKES_QUERY_KEY,
    queryFn: ({ pageParam, signal }) => fetchEarthquakePage(pageParam as number, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
    staleTime: STALE_MS,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const {
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage: rawFetchNextPage,
    refetch: rawRefetch,
  } = query;

  // No idle auto-prefetch — pages load only when the user navigates to them
  // via the table's pagination controls. This keeps cold-load bandwidth
  // bounded to a single page (~200 ms) and avoids the "everything is
  // streaming" perception users had with the previous design.

  // Stable callback identity so the table's pagination controls don't trip
  // re-renders on the parent's behalf. Returns a Promise so the caller can
  // `await` it before incrementing the page index.
  const fetchNextPage = useCallback(async (): Promise<void> => {
    if (!hasNextPage || isFetchingNextPage) return;
    await rawFetchNextPage();
  }, [hasNextPage, isFetchingNextPage, rawFetchNextPage]);

  const refetch = useCallback(() => {
    rawRefetch();
  }, [rawRefetch]);

  const records = useMemo<EarthquakeRecord[]>(() => {
    if (!query.data) return [];
    // `flat()` is O(n) and runs once per page resolution; for 10k rows
    // that's <2 ms — well under a frame budget.
    const out: EarthquakeRecord[] = [];
    for (const page of query.data.pages) {
      for (const r of page.data) out.push(r);
    }
    return out;
  }, [query.data]);

  const firstPage = query.data?.pages[0];
  const lastPage = query.data?.pages[query.data.pages.length - 1];

  return {
    records,
    total: lastPage?.meta.total ?? firstPage?.meta.total ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    isComplete: !query.hasNextPage && query.data !== undefined,
    isError: query.isError,
    error: query.error,
    cachedByApi: firstPage?.meta.cached ?? false,
    fetchNextPage,
    refetch,
    dataUpdatedAt: query.dataUpdatedAt,
  };
};

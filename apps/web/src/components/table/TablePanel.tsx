import { useCallback, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useEarthquakeStore } from '@/store/useEarthquakeStore';
import { useSelectedEarthquake } from '@/context/SelectedEarthquakeContext';
import type { EarthquakeRecord } from '@atlas/shared-types';
import { EarthquakeTable } from './EarthquakeTable';
import { TablePagination } from './TablePagination';

interface TablePanelProps {
  /** All filtered records loaded into the FE so far (across all paginated fetches). */
  records: readonly EarthquakeRecord[];
  loading: boolean;
  /** Total records available on the server (pre-FE-filter). */
  total: number;
  /** True while a background page fetch is in flight. */
  isFetchingNextPage: boolean;
  /** True when every server page has been loaded. */
  isComplete: boolean;
  /** Trigger fetching one more page from the API. Resolves when the page lands. */
  onLoadMore: () => Promise<void>;
}

/**
 * Container that pulls hover from Zustand and selection from the
 * SelectedEarthquakeContext. Demonstrates all three state-sharing patterns:
 *   - Zustand for hover + pagination state (high frequency / cross-cutting)
 *   - Context for selection (resolved record reused in multiple subtrees)
 *   - Props for the data + callbacks handed to <EarthquakeTable />
 *
 * Pagination model:
 *   - The table renders **one page at a time** (default 50 records).
 *   - "Next" advances `currentPage`. If the requested page's data hasn't been
 *     fetched from the API yet, we transparently call `onLoadMore()` first
 *     and show a loading state during the brief wait.
 *   - "Last" jumps to the final loaded page; the user can keep paginating
 *     past it to force the remaining server pages to load.
 *   - Chart → Table sync: selecting a record outside the current page
 *     auto-jumps the table to its page.
 */
export const TablePanel = ({
  records,
  loading,
  total,
  isFetchingNextPage,
  isComplete,
  onLoadMore,
}: TablePanelProps) => {
  const { selectedId, setSelectedId } = useSelectedEarthquake();
  const hoveredId = useEarthquakeStore((s) => s.hoveredId);
  const setHoveredId = useEarthquakeStore((s) => s.setHoveredId);
  const currentPage = useEarthquakeStore((s) => s.currentPage);
  const pageSize = useEarthquakeStore((s) => s.pageSize);
  const setCurrentPage = useEarthquakeStore((s) => s.setCurrentPage);

  // Total filtered records currently loaded into the FE. The chart sees all
  // of them; the table renders only the current page slice.
  const loadedCount = records.length;

  // Pages from currently-loaded data, plus a single "+1" slot when more
  // pages are still available on the server. Clicking that slot triggers a
  // background fetch — the user sees the table grow chunk-by-chunk.
  //
  // Why not derive totalPages from the API's `total`? Because filters run
  // client-side: a server-side total of 8000 might collapse to 200 after
  // a strict search, and we don't want to advertise pages that have no
  // records on them.
  const loadedPages = Math.max(1, Math.ceil(loadedCount / pageSize));
  const hasMoreOnServer = !isComplete;
  const totalPages = hasMoreOnServer ? loadedPages + 1 : loadedPages;

  // Clamp current page if it falls off the end (e.g. user shrunk the
  // dataset via filters). Read-only — the store's filter setters reset to
  // 0 directly, so this is just a safety net.
  const safePage = Math.min(currentPage, totalPages - 1);

  const sliceStart = safePage * pageSize;
  const sliceEnd = sliceStart + pageSize;
  const pageRecords = useMemo(
    () => records.slice(sliceStart, sliceEnd),
    [records, sliceStart, sliceEnd],
  );

  const handleRowClick = useCallback(
    (id: string) => setSelectedId(id === selectedId ? null : id),
    [selectedId, setSelectedId],
  );
  const handleRowHover = useCallback(
    (id: string | null) => setHoveredId(id),
    [setHoveredId],
  );

  /**
   * Page navigation. If the requested page's data isn't loaded yet, fire
   * one server-page fetch first. We deliberately fetch at most one chunk
   * per click — the user sees explicit per-click loading rather than the
   * "everything is streaming" UX we had with auto-prefetch.
   */
  const handlePageChange = useCallback(
    async (next: number) => {
      const clamped = Math.max(0, Math.min(next, totalPages - 1));
      const needsFetch =
        hasMoreOnServer && (clamped + 1) * pageSize > loadedCount;

      // Navigate first so the user sees the page change immediately; the
      // loading indicator in the pager will surface the in-flight fetch.
      setCurrentPage(clamped);

      if (needsFetch) {
        await onLoadMore();
      }
    },
    [totalPages, hasMoreOnServer, pageSize, loadedCount, onLoadMore, setCurrentPage],
  );

  // Chart → Table sync: when a chart selection lands on a record outside
  // the current page, jump to the page containing it.
  useEffect(() => {
    if (!selectedId) return;
    const index = records.findIndex((r) => r.id === selectedId);
    if (index < 0) return;
    const targetPage = Math.floor(index / pageSize);
    if (targetPage !== safePage) setCurrentPage(targetPage);
  }, [selectedId, records, pageSize, safePage, setCurrentPage]);

  const rangeStart = loadedCount === 0 ? 0 : sliceStart + 1;
  const rangeEnd = Math.min(sliceEnd, loadedCount);

  return (
    <Card
      title="Event records"
      description="Click a row to lock-select it. Hover to highlight in the chart."
      className="min-h-[520px]"
      flush
    >
      {loading ? (
        <div className="flex flex-1 flex-col gap-2 p-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : loadedCount === 0 ? (
        <EmptyState
          title="No matching events"
          message="Adjust the filters above to see seismic activity."
        />
      ) : (
        <>
          <EarthquakeTable
            records={pageRecords}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onRowClick={handleRowClick}
            onRowHover={handleRowHover}
          />
          <TablePagination
            currentPage={safePage}
            totalPages={totalPages}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            totalRecords={loadedCount}
            hasMoreOnServer={hasMoreOnServer}
            isFetching={isFetchingNextPage}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </Card>
  );
};

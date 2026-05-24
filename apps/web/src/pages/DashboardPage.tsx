import { AppHeader } from '@/components/layout/AppHeader';
import { ChartPanel } from '@/components/chart/ChartPanel';
import { TablePanel } from '@/components/table/TablePanel';
import { FilterBar } from '@/components/filters/FilterBar';
import { StatsBar } from '@/components/stats/StatsBar';
import { SelectionBanner } from '@/components/selection/SelectionBanner';
import { ErrorState } from '@/components/ui/ErrorState';
import { SelectedEarthquakeProvider } from '@/context/SelectedEarthquakeContext';
import { useEarthquakes } from '@/hooks/useEarthquakes';
import { useFilteredEarthquakes } from '@/hooks/useFilteredEarthquakes';
import { useEarthquakeStats } from '@/hooks/useEarthquakeStats';
import { useLoadSampleData } from '@/hooks/useLoadSampleData';

/**
 * Top-level dashboard composition.
 *
 * Responsibilities:
 *   - Drive the paginated network calls (`useEarthquakes` → useInfiniteQuery).
 *   - Apply filters → derive the visible slice for the chart + table.
 *   - Pull server-computed stats in parallel with the first page.
 *   - Mount the Context Provider with the resolved dataset.
 *
 * Notably *does not* hold per-component UI state — that lives in Zustand or
 * the SelectedEarthquakeContext. This separation keeps the page thin and
 * easy to test.
 */
export const DashboardPage = () => {
  const {
    records,
    total,
    isLoading,
    isFetching,
    isFetchingNextPage,
    isComplete,
    isError,
    error,
    cachedByApi,
    fetchNextPage,
    refetch,
    dataUpdatedAt,
  } = useEarthquakes();

  const { loadSample, clearSample, isLoading: isSampleLoading, isSampleMode } = useLoadSampleData();

  const filtered = useFilteredEarthquakes(records);
  // Server-side stats reflect the **full** dataset; filtered count is shown
  // separately in the filter bar. Fallback records keep tiles populated
  // during the brief window before the stats endpoint resolves.
  const { stats, isLoading: statsLoading } = useEarthquakeStats(records);

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  return (
    <SelectedEarthquakeProvider records={filtered}>
      <div className="flex min-h-screen flex-col">
        <AppHeader
          lastUpdated={lastUpdated}
          isFetching={isFetching}
          cachedByApi={cachedByApi}
          onRefresh={() => refetch()}
          isSampleMode={isSampleMode}
          isSampleLoading={isSampleLoading}
          onLoadSample={loadSample}
          onClearSample={clearSample}
        />

        <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 px-6 py-6">
          {isError ? (
            <ErrorState
              title="Couldn't load earthquake data"
              message={error?.message ?? 'Unknown error fetching the USGS feed.'}
              onRetry={() => refetch()}
            />
          ) : (
            <>
              <StatsBar stats={stats} loading={statsLoading} />
              <SelectionBanner />
              <FilterBar visibleRecords={filtered} totalCount={total || records.length} />

              <div className="grid flex-1 grid-cols-1 gap-4 xl:grid-cols-5">
                <div className="xl:col-span-3">
                  <ChartPanel records={filtered} loading={isLoading} />
                </div>
                <div className="xl:col-span-2">
                  <TablePanel
                    records={filtered}
                    loading={isLoading}
                    total={total}
                    isFetchingNextPage={isFetchingNextPage}
                    isComplete={isComplete}
                    onLoadMore={fetchNextPage}
                  />
                </div>
              </div>
            </>
          )}
        </main>

        <footer className="border-t border-slate-200 bg-white px-6 py-3 text-center text-xs text-slate-500">
          Data: United States Geological Survey · Refreshed every 5 minutes ·{' '}
          <a
            href="https://earthquake.usgs.gov/earthquakes/feed/v1.0/csv.php"
            target="_blank"
            rel="noreferrer noopener"
            className="text-brand-600 underline-offset-2 hover:underline"
          >
            Feed documentation
          </a>
        </footer>
      </div>
    </SelectedEarthquakeProvider>
  );
};

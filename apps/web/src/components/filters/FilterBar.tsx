import { memo, useId } from 'react';
import { useEarthquakeStore } from '@/store/useEarthquakeStore';
import { downloadCsv } from '@/utils/csvExport';
import type { EarthquakeRecord } from '@atlas/shared-types';

interface FilterBarProps {
  /** Filtered records — passed in so the export button only writes what the user sees. */
  visibleRecords: readonly EarthquakeRecord[];
  totalCount: number;
}

/**
 * Filter + actions bar. All filter state lives in the Zustand store so the
 * chart and table both react to changes without prop drilling.
 */
export const FilterBar = memo(({ visibleRecords, totalCount }: FilterBarProps) => {
  const searchQuery = useEarthquakeStore((s) => s.searchQuery);
  const setSearchQuery = useEarthquakeStore((s) => s.setSearchQuery);
  const minMagnitude = useEarthquakeStore((s) => s.minMagnitude);
  const setMinMagnitude = useEarthquakeStore((s) => s.setMinMagnitude);
  const tsunamiOnly = useEarthquakeStore((s) => s.tsunamiOnly);
  const setTsunamiOnly = useEarthquakeStore((s) => s.setTsunamiOnly);
  const resetFilters = useEarthquakeStore((s) => s.resetFilters);

  const searchId = useId();
  const magId = useId();
  const tsuId = useId();

  const handleExport = () => {
    if (visibleRecords.length === 0) return;
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(visibleRecords, `earthquakes-${stamp}.csv`);
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex min-w-[200px] flex-1 flex-col gap-1">
        <label htmlFor={searchId} className="text-xs font-medium text-slate-600">
          Search location
        </label>
        <div className="relative">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id={searchId}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g. Alaska, Japan, Chile…"
            className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-sm shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
      </div>

      <div className="flex w-44 flex-col gap-1">
        <label htmlFor={magId} className="flex items-center justify-between text-xs font-medium text-slate-600">
          Min magnitude
          <span className="tabular-nums text-slate-900">{minMagnitude.toFixed(1)}</span>
        </label>
        <input
          id={magId}
          type="range"
          min={0}
          max={8}
          step={0.5}
          value={minMagnitude}
          onChange={(e) => setMinMagnitude(Number(e.target.value))}
          className="accent-brand-600"
          aria-valuemin={0}
          aria-valuemax={8}
          aria-valuenow={minMagnitude}
        />
      </div>

      <div className="flex items-center gap-2 pb-1.5">
        <input
          id={tsuId}
          type="checkbox"
          checked={tsunamiOnly}
          onChange={(e) => setTsunamiOnly(e.target.checked)}
          className="h-4 w-4 cursor-pointer rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        <label htmlFor={tsuId} className="cursor-pointer text-sm text-slate-700">
          Tsunami flag only
        </label>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="text-xs text-slate-500">
          Showing{' '}
          <span className="font-semibold tabular-nums text-slate-800">
            {visibleRecords.length.toLocaleString()}
          </span>{' '}
          of{' '}
          <span className="tabular-nums">{totalCount.toLocaleString()}</span>
        </span>
        <button
          type="button"
          onClick={resetFilters}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={visibleRecords.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
          </svg>
          Export CSV
        </button>
      </div>
    </div>
  );
});
FilterBar.displayName = 'FilterBar';

import { memo } from 'react';

interface AppHeaderProps {
  lastUpdated: Date | null;
  isFetching: boolean;
  /** True when the most recent response was served from the API's in-memory cache. */
  cachedByApi: boolean;
  onRefresh: () => void;
  isSampleMode: boolean;
  isSampleLoading: boolean;
  onLoadSample: () => void;
  onClearSample: () => void;
}

export const AppHeader = memo(({
  lastUpdated,
  isFetching,
  cachedByApi,
  onRefresh,
  isSampleMode,
  isSampleLoading,
  onLoadSample,
  onClearSample,
}: AppHeaderProps) => (
  <header className="border-b border-slate-200 bg-white">
    <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-4 px-6 py-4">
      <div className="flex items-center gap-3">
        <div
          aria-hidden="true"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-card"
        >
          <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19 L10 19 L12 13 L16 23 L20 9 L23 19 L28 19" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Atlas Insights</h1>
          <p className="text-xs text-slate-500">
            Real-time seismic activity · USGS public feed
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-500">
        {isSampleMode && (
          <span
            title="Displaying bundled sample data — not the live USGS feed"
            className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
            Sample data
          </span>
        )}
        {cachedByApi && !isSampleMode && (
          <span
            title="Served from the NestJS in-memory cache (5 min TTL)"
            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            API cache hit
          </span>
        )}
        {lastUpdated && !isSampleMode && (
          <span aria-live="polite">
            Updated{' '}
            <time dateTime={lastUpdated.toISOString()} className="font-medium text-slate-700">
              {lastUpdated.toLocaleTimeString()}
            </time>
          </span>
        )}
        {isSampleMode ? (
          <button
            type="button"
            onClick={onClearSample}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm transition hover:border-amber-400 hover:bg-amber-100"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            Clear sample
          </button>
        ) : (
          <button
            type="button"
            onClick={onLoadSample}
            disabled={isSampleLoading}
            title="Load 20 bundled fixture records to verify chart and table rendering"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-amber-400 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path d="M9 12h6M9 16h4" />
            </svg>
            {isSampleLoading ? 'Loading…' : 'Load sample'}
          </button>
        )}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isFetching || isSampleMode}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 11-3-6.7L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </div>
  </header>
));
AppHeader.displayName = 'AppHeader';

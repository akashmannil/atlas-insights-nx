import { memo } from 'react';

interface AppHeaderProps {
  lastUpdated: Date | null;
  isFetching: boolean;
  /** True when the most recent response was served from the API's in-memory cache. */
  cachedByApi: boolean;
  onRefresh: () => void;
}

export const AppHeader = memo(({ lastUpdated, isFetching, cachedByApi, onRefresh }: AppHeaderProps) => (
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
        {cachedByApi && (
          <span
            title="Served from the NestJS in-memory cache (5 min TTL)"
            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            API cache hit
          </span>
        )}
        {lastUpdated && (
          <span aria-live="polite">
            Updated{' '}
            <time dateTime={lastUpdated.toISOString()} className="font-medium text-slate-700">
              {lastUpdated.toLocaleTimeString()}
            </time>
          </span>
        )}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isFetching}
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

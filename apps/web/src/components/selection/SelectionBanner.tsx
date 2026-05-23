import { useSelectedEarthquake } from '@/context/SelectedEarthquakeContext';
import { magnitudeStyle } from '@/utils/colors';
import { formatCoord, formatDateTime, formatNumber } from '@/utils/format';

/**
 * Pulls directly from the SelectedEarthquakeContext — no props.
 *
 * This is the canonical "shared selection without prop drilling" demo: this
 * banner lives several levels removed from where the click happens, and yet
 * it stays in sync without the App component knowing it exists.
 */
export const SelectionBanner = () => {
  const { selected, clearSelection } = useSelectedEarthquake();

  if (!selected) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-3 text-sm text-slate-500">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Click an event in the chart or table to inspect it here.
      </div>
    );
  }

  const mag = magnitudeStyle(selected.magnitude);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center gap-4 rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 to-white px-4 py-3 shadow-card animate-fade-in"
    >
      <span
        className={`inline-flex h-9 w-12 items-center justify-center rounded-lg text-sm font-bold tabular-nums ${mag.bg} ${mag.text}`}
        title={`${mag.label} earthquake`}
      >
        M{formatNumber(selected.magnitude, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900" title={selected.place}>
          {selected.place}
        </p>
        <p className="text-xs text-slate-500">
          {formatDateTime(selected.time)} · {formatCoord(selected.latitude)},{' '}
          {formatCoord(selected.longitude)} · {formatNumber(selected.depth, 1)} km deep
        </p>
      </div>
      {selected.tsunami === 1 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
          ⚠ Tsunami advisory
        </span>
      )}
      <button
        type="button"
        onClick={clearSelection}
        className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white"
      >
        Clear
      </button>
    </div>
  );
};

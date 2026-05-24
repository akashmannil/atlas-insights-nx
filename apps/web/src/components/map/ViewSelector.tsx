import { memo } from 'react';
import type { ActiveView } from '@/store/useEarthquakeStore';

interface ViewSelectorProps {
  value: ActiveView;
  onChange: (view: ActiveView) => void;
}

interface ViewOption {
  readonly value: ActiveView;
  readonly label: string;
}

const OPTIONS: readonly ViewOption[] = [
  { value: 'chart', label: 'Chart' },
  { value: 'map', label: 'Map' },
];

/**
 * Segmented control that toggles the primary visualisation between the
 * scatter chart and the world map.
 *
 * Presentational only — the parent owns the active value (Zustand) and the
 * setter, so the same control can be hosted from either panel header without
 * coupling them to the store.
 */
export const ViewSelector = memo(({ value, onChange }: ViewSelectorProps) => (
  <div
    role="tablist"
    aria-label="Primary view"
    className="inline-flex rounded-lg border border-slate-200 bg-surface-subtle p-0.5"
  >
    {OPTIONS.map((opt) => {
      const isActive = opt.value === value;
      return (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={isActive}
          onClick={() => onChange(opt.value)}
          className={
            'rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ' +
            (isActive
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700')
          }
        >
          {opt.label}
        </button>
      );
    })}
  </div>
));
ViewSelector.displayName = 'ViewSelector';

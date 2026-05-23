import { memo } from 'react';
import type { EarthquakeStats } from '@/hooks/useEarthquakeStats';
import { formatInteger, formatNumber } from '@/utils/format';
import { Skeleton } from '@/components/ui/Skeleton';

interface StatsBarProps {
  stats: EarthquakeStats;
  loading: boolean;
}

interface StatTile {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'warning' | 'danger';
}

const toneClass: Record<NonNullable<StatTile['tone']>, string> = {
  default: 'text-slate-900',
  warning: 'text-amber-700',
  danger: 'text-red-700',
};

export const StatsBar = memo(({ stats, loading }: StatsBarProps) => {
  const tiles: StatTile[] = [
    { label: 'Events', value: formatInteger(stats.count) },
    {
      label: 'Avg magnitude',
      value: formatNumber(stats.averageMagnitude, 2),
    },
    {
      label: 'Peak magnitude',
      value: formatNumber(stats.maxMagnitude, 1),
      tone:
        (stats.maxMagnitude ?? 0) >= 6
          ? 'danger'
          : (stats.maxMagnitude ?? 0) >= 5
            ? 'warning'
            : 'default',
    },
    {
      label: 'Significant',
      value: formatInteger(stats.significantCount),
      hint: 'sig ≥ 600',
    },
    {
      label: 'Tsunami flags',
      value: formatInteger(stats.tsunamiCount),
      tone: stats.tsunamiCount > 0 ? 'warning' : 'default',
    },
  ];

  return (
    <div
      role="region"
      aria-label="Dataset summary"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
    >
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-card"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {tile.label}
            {tile.hint && <span className="ml-1 text-[10px] text-slate-400">({tile.hint})</span>}
          </p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-20" />
          ) : (
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass[tile.tone ?? 'default']}`}>
              {tile.value}
            </p>
          )}
        </div>
      ))}
    </div>
  );
});
StatsBar.displayName = 'StatsBar';

import { useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useEarthquakeStore } from '@/store/useEarthquakeStore';
import type { EarthquakeRecord } from '@atlas/shared-types';
import { AxisSelector } from './AxisSelector';
import { EarthquakeChart } from './EarthquakeChart';

interface ChartPanelProps {
  records: readonly EarthquakeRecord[];
  loading: boolean;
}

/**
 * Container that owns chart-related slice of the global store and passes
 * primitives down to <EarthquakeChart /> via props. This boundary is where
 * Zustand subscriptions are concentrated so the inner chart can stay
 * `memo`-friendly.
 */
export const ChartPanel = ({ records, loading }: ChartPanelProps) => {
  const xAxis = useEarthquakeStore((s) => s.xAxis);
  const yAxis = useEarthquakeStore((s) => s.yAxis);
  const setXAxis = useEarthquakeStore((s) => s.setXAxis);
  const setYAxis = useEarthquakeStore((s) => s.setYAxis);
  const selectedId = useEarthquakeStore((s) => s.selectedId);
  const hoveredId = useEarthquakeStore((s) => s.hoveredId);
  const setSelectedId = useEarthquakeStore((s) => s.setSelectedId);
  const setHoveredId = useEarthquakeStore((s) => s.setHoveredId);

  // Stable callbacks — the chart is memoized and we don't want a new function
  // identity on every parent render to bust that.
  const handlePointClick = useCallback(
    (id: string) => setSelectedId(id === selectedId ? null : id),
    [selectedId, setSelectedId],
  );
  const handlePointHover = useCallback(
    (id: string | null) => setHoveredId(id),
    [setHoveredId],
  );

  return (
    <Card
      title="Scatter chart"
      description="Each marker is an event. Pick variables for X and Y, click to lock-select, hover to peek."
      actions={
        <AxisSelector
          xAxis={xAxis}
          yAxis={yAxis}
          onXChange={setXAxis}
          onYChange={setYAxis}
        />
      }
      className="min-h-[520px]"
      flush
    >
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-2">
          {loading ? (
            <Skeleton className="h-full w-full" />
          ) : records.length === 0 ? (
            <EmptyState
              title="No events match the current filters"
              message="Try lowering the minimum magnitude or clearing the search field."
            />
          ) : (
            <EarthquakeChart
              records={records}
              xAxis={xAxis}
              yAxis={yAxis}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onPointClick={handlePointClick}
              onPointHover={handlePointHover}
            />
          )}
        </div>
      </div>
    </Card>
  );
};

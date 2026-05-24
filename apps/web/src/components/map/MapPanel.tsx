import { useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useEarthquakeStore } from '@/store/useEarthquakeStore';
import type { EarthquakeRecord } from '@atlas/shared-types';
import { EarthquakeMap } from './EarthquakeMap';
import { ViewSelector } from './ViewSelector';

interface MapPanelProps {
  records: readonly EarthquakeRecord[];
  loading: boolean;
}

/**
 * Container that owns the map-related slice of the global store and forwards
 * primitives to <EarthquakeMap />. Matches the ChartPanel boundary so
 * Zustand subscriptions stay concentrated and the leaf is memo-friendly.
 */
export const MapPanel = ({ records, loading }: MapPanelProps) => {
  const activeView = useEarthquakeStore((s) => s.activeView);
  const setActiveView = useEarthquakeStore((s) => s.setActiveView);
  const selectedId = useEarthquakeStore((s) => s.selectedId);
  const hoveredId = useEarthquakeStore((s) => s.hoveredId);
  const setSelectedId = useEarthquakeStore((s) => s.setSelectedId);
  const setHoveredId = useEarthquakeStore((s) => s.setHoveredId);

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
      title="World map"
      description="Each marker is an event positioned by latitude/longitude. Click to lock-select, hover to peek."
      actions={<ViewSelector value={activeView} onChange={setActiveView} />}
      className="min-h-[700px]"
      flush
    >
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-2 overflow-hidden rounded-xl">
          {loading ? (
            <Skeleton className="h-full w-full" />
          ) : records.length === 0 ? (
            <EmptyState
              title="No events match the current filters"
              message="Try lowering the minimum magnitude or clearing the search field."
            />
          ) : (
            <EarthquakeMap
              records={records}
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

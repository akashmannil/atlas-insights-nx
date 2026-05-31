import { memo, useCallback, useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { EarthquakeRecord } from '@atlas/shared-types';
import { magnitudeStyle } from '@/utils/colors';

interface EarthquakeMapProps {
  records: readonly EarthquakeRecord[];
  selectedId: string | null;
  hoveredId: string | null;
  onPointClick: (id: string) => void;
  onPointHover: (id: string | null) => void;
}

interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  color: string;
  record: EarthquakeRecord;
}

// Marker radius (px) scales gently with magnitude. Capped so a single great
// quake doesn't drown the rest of the world.
const radiusForMagnitude = (magnitude: number | null): number => {
  if (magnitude === null || magnitude < 0) return 4;
  return Math.max(4, Math.min(18, 3 + magnitude * 1.8));
};

/**
 * Pans/zooms the map to follow the currently selected earthquake. Lives
 * inside the MapContainer so it can call `useMap()`.
 */
const FlyToSelection = ({ point }: { point: MapPoint | null }) => {
  const map = useMap();
  useEffect(() => {
    if (!point) return;
    const currentZoom = map.getZoom();
    map.flyTo([point.lat, point.lng], Math.max(currentZoom, 4), {
      duration: 0.6,
    });
  }, [point, map]);
  return null;
};

/**
 * Interactive world map of earthquake events.
 *
 * Why CircleMarker (not Marker):
 *   - No icon-image assets required — Leaflet's default markers ship with
 *     bundler-unfriendly image paths. Circles are SVG, sized in screen pixels,
 *     and pick up the same magnitude colour ramp as the scatter chart.
 *
 * Performance:
 *   - `points` is memoized over `records`, so toggling selection/hover does
 *     NOT recompute the marker set.
 *   - `isAnimationActive` is disabled implicitly: CircleMarker doesn't animate.
 *
 * Interaction parity with the chart:
 *   - Click toggles selection (same id → clears).
 *   - Hover sets/clears `hoveredId`.
 *   - The selected event pans into view via FlyToSelection.
 */
const EarthquakeMapImpl = ({
  records,
  selectedId,
  hoveredId,
  onPointClick,
  onPointHover,
}: EarthquakeMapProps) => {
  const points = useMemo<MapPoint[]>(() => {
    const out: MapPoint[] = [];
    for (const r of records) {
      // USGS sometimes emits rows with null lat/lng for theoretical events —
      // skip them rather than plot at (0,0).
      if (r.latitude === null || r.longitude === null) continue;
      out.push({
        id: r.id,
        lat: r.latitude,
        lng: r.longitude,
        radius: radiusForMagnitude(r.magnitude),
        color: magnitudeStyle(r.magnitude).hex,
        record: r,
      });
    }
    return out;
  }, [records]);

  const selectedPoint = useMemo(
    () => (selectedId ? points.find((p) => p.id === selectedId) ?? null : null),
    [points, selectedId],
  );

  const handleMouseOut = useCallback(() => onPointHover(null), [onPointHover]);

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      minZoom={2}
      maxZoom={9}
      worldCopyJump
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((p) => {
        const isSelected = p.id === selectedId;
        const isHovered = p.id === hoveredId;
        const isHighlighted = isSelected || isHovered;
        return (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={p.radius + (isHighlighted ? 3 : 0)}
            pathOptions={{
              color: isSelected ? '#1a43b0' : '#1a3a8a',
              weight: isHighlighted ? 2.5 : 0.8,
              opacity: 0.9,
              fillColor: p.color,
              fillOpacity: isHighlighted ? 0.85 : 0.55,
            }}
            eventHandlers={{
              click: () => onPointClick(p.id),
              mouseover: () => onPointHover(p.id),
              mouseout: handleMouseOut,
            }}
          >
            <Tooltip direction="top" offset={[0, -2]} opacity={1} sticky>
              <div className="text-xs">
                <div className="font-semibold text-slate-800">
                  M {p.record.magnitude?.toFixed(1) ?? '—'}
                </div>
                <div className="text-slate-600">{p.record.place}</div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
      <FlyToSelection point={selectedPoint} />
    </MapContainer>
  );
};

export const EarthquakeMap = memo(EarthquakeMapImpl);
EarthquakeMap.displayName = 'EarthquakeMap';

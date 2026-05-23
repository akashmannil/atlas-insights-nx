import { memo, useCallback, useMemo } from 'react';
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import type { EarthquakeRecord, NumericField } from '@atlas/shared-types';
import { AXIS_OPTIONS } from '@atlas/shared-types';
import { magnitudeStyle } from '@/utils/colors';
import { ChartTooltip } from './ChartTooltip';

interface EarthquakeChartProps {
  records: readonly EarthquakeRecord[];
  xAxis: NumericField;
  yAxis: NumericField;
  selectedId: string | null;
  hoveredId: string | null;
  onPointClick: (id: string) => void;
  onPointHover: (id: string | null) => void;
}

interface ChartPoint {
  id: string;
  x: number;
  y: number;
  z: number;
  fill: string;
  record: EarthquakeRecord;
}

const labelFor = (field: NumericField): string => {
  const opt = AXIS_OPTIONS.find((o) => o.value === field);
  if (!opt) return field;
  return opt.unit ? `${opt.label} (${opt.unit})` : opt.label;
};

/**
 * Scatter plot of earthquake events.
 *
 * Performance:
 *   - `points` is memoized over (records, xAxis, yAxis) so axis swaps don't
 *     recompute when records change only by reference.
 *   - Selection/hover do NOT trigger a points recompute — they only flip a
 *     few SVG attributes via the highlight overlay.
 *
 * Interaction:
 *   - Recharts dispatches `onClick` / `onMouseEnter` on the entire <Scatter>
 *     series with the active payload. We bubble id up through props so the
 *     parent decides where to persist it (Zustand, in our case).
 */
const EarthquakeChartImpl = ({
  records,
  xAxis,
  yAxis,
  selectedId,
  hoveredId,
  onPointClick,
  onPointHover,
}: EarthquakeChartProps) => {
  // Project records into chart-space, dropping any row that's missing a value
  // for either axis. Plotting `NaN` would silently corrupt Recharts' domain.
  const points = useMemo<ChartPoint[]>(() => {
    const out: ChartPoint[] = [];
    for (const r of records) {
      const x = r[xAxis];
      const y = r[yAxis];
      if (x === null || y === null) continue;
      out.push({
        id: r.id,
        x,
        y,
        z: Math.max(20, ((r.magnitude ?? 1) ** 2) * 6),
        fill: magnitudeStyle(r.magnitude).hex,
        record: r,
      });
    }
    return out;
  }, [records, xAxis, yAxis]);

  // Highlight overlay: a single-point series rendered on top so the selected
  // / hovered marker is always above the dense base layer.
  const highlightPoints = useMemo<ChartPoint[]>(() => {
    const targets = new Set<string>();
    if (selectedId) targets.add(selectedId);
    if (hoveredId) targets.add(hoveredId);
    if (targets.size === 0) return [];
    return points.filter((p) => targets.has(p.id));
  }, [points, selectedId, hoveredId]);

  const handleSeriesClick = useCallback(
    (data: { payload?: { id?: string } } | null | undefined) => {
      const id = data?.payload?.id;
      if (id) onPointClick(id);
    },
    [onPointClick],
  );

  const handleSeriesMouseEnter = useCallback(
    (data: { payload?: { id?: string } } | null | undefined) => {
      const id = data?.payload?.id ?? null;
      if (id) onPointHover(id);
    },
    [onPointHover],
  );

  const handleSeriesMouseLeave = useCallback(() => onPointHover(null), [onPointHover]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 16, right: 24, left: 8, bottom: 24 }}>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="x"
          name={labelFor(xAxis)}
          stroke="#64748b"
          tick={{ fill: '#475569', fontSize: 12 }}
          label={{
            value: labelFor(xAxis),
            position: 'insideBottom',
            offset: -10,
            style: { fill: '#475569', fontSize: 12, fontWeight: 500 },
          }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={labelFor(yAxis)}
          stroke="#64748b"
          tick={{ fill: '#475569', fontSize: 12 }}
          label={{
            value: labelFor(yAxis),
            angle: -90,
            position: 'insideLeft',
            style: { fill: '#475569', fontSize: 12, fontWeight: 500 },
          }}
        />
        {/* Z-axis drives marker size — we use magnitude² so big events pop. */}
        <ZAxis type="number" dataKey="z" range={[20, 400]} />
        <Tooltip
          cursor={{ strokeDasharray: '3 3', stroke: '#94a3b8' }}
          content={<ChartTooltip xAxis={xAxis} yAxis={yAxis} />}
        />
        <Scatter
          data={points}
          fill="#5290ff"
          fillOpacity={0.55}
          stroke="#1a43b0"
          strokeWidth={0.5}
          // Avoid the entry animation on every re-render — it's distracting
          // when the user toggles filters.
          isAnimationActive={false}
          onClick={handleSeriesClick}
          onMouseEnter={handleSeriesMouseEnter}
          onMouseLeave={handleSeriesMouseLeave}
          shape={(props: unknown) => {
            const { cx, cy, payload, fill } = props as {
              cx: number;
              cy: number;
              payload: ChartPoint;
              fill: string;
            };
            const radius = Math.max(3, Math.min(14, Math.sqrt(payload.z) * 0.45));
            return (
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill={fill}
                fillOpacity={0.55}
                stroke="#1a43b0"
                strokeWidth={0.5}
                style={{ cursor: 'pointer' }}
              />
            );
          }}
        />
        {highlightPoints.length > 0 && (
          <Scatter
            data={highlightPoints}
            isAnimationActive={false}
            // The highlight layer ignores pointer events so the underlying
            // marker still receives clicks/hovers normally.
            style={{ pointerEvents: 'none' }}
            shape={(props: unknown) => {
              const { cx, cy, payload } = props as {
                cx: number;
                cy: number;
                payload: ChartPoint;
              };
              const isSelected = payload.id === selectedId;
              const baseR = Math.max(3, Math.min(14, Math.sqrt(payload.z) * 0.45));
              const ringR = baseR + (isSelected ? 8 : 5);
              return (
                <g>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={ringR}
                    fill="none"
                    stroke={isSelected ? '#1a43b0' : '#5290ff'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    strokeOpacity={isSelected ? 0.9 : 0.6}
                  />
                  <circle cx={cx} cy={cy} r={baseR} fill={payload.fill} stroke="#1a3a8a" strokeWidth={1.5} />
                </g>
              );
            }}
          />
        )}
      </ScatterChart>
    </ResponsiveContainer>
  );
};

export const EarthquakeChart = memo(EarthquakeChartImpl);
EarthquakeChart.displayName = 'EarthquakeChart';

import type { EarthquakeRecord, NumericField } from '@atlas/shared-types';
import { AXIS_OPTIONS } from '@atlas/shared-types';
import { formatDateTime, formatNumber } from '@/utils/format';
import { magnitudeStyle } from '@/utils/colors';

interface ChartTooltipProps {
  active?: boolean;
  // Recharts injects `payload` as `{ payload: ourPoint }[]`. We narrow it
  // here so the rest of the component is fully typed.
  payload?: ReadonlyArray<{ payload: { record: EarthquakeRecord } }>;
  xAxis: NumericField;
  yAxis: NumericField;
}

const labelFor = (field: NumericField): string =>
  AXIS_OPTIONS.find((o) => o.value === field)?.label ?? field;

export const ChartTooltip = ({ active, payload, xAxis, yAxis }: ChartTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;
  const first = payload[0];
  if (!first) return null;
  const record = first.payload.record;
  const mag = magnitudeStyle(record.magnitude);

  return (
    <div
      role="tooltip"
      className="min-w-[220px] max-w-[280px] rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-semibold text-slate-900">{record.place}</p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${mag.bg} ${mag.text}`}
        >
          M {formatNumber(record.magnitude, 1)}
        </span>
      </div>
      <p className="mt-1 text-slate-500">{formatDateTime(record.time)}</p>
      <dl className="mt-2 grid grid-cols-2 gap-1 border-t border-slate-100 pt-2 text-slate-600">
        <dt>{labelFor(xAxis)}</dt>
        <dd className="text-right font-medium tabular-nums text-slate-800">
          {formatNumber(record[xAxis], 2)}
        </dd>
        <dt>{labelFor(yAxis)}</dt>
        <dd className="text-right font-medium tabular-nums text-slate-800">
          {formatNumber(record[yAxis], 2)}
        </dd>
        {record.tsunami === 1 && (
          <>
            <dt className="text-amber-700">Tsunami</dt>
            <dd className="text-right font-semibold text-amber-700">Advisory</dd>
          </>
        )}
      </dl>
    </div>
  );
};

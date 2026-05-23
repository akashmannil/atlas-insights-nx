import { createColumnHelper } from '@tanstack/react-table';
import type { EarthquakeRecord } from '@atlas/shared-types';
import { formatCoord, formatDateTime, formatInteger, formatNumber } from '@/utils/format';
import { magnitudeStyle } from '@/utils/colors';

const columnHelper = createColumnHelper<EarthquakeRecord>();

/**
 * Column definitions live in their own module so the table component stays
 * focused on rendering / virtualization concerns.
 */
export const earthquakeColumns = [
  columnHelper.accessor('time', {
    header: 'Time (UTC)',
    cell: (info) => (
      <span className="whitespace-nowrap tabular-nums text-slate-700">
        {formatDateTime(info.getValue())}
      </span>
    ),
    size: 170,
  }),
  columnHelper.accessor('place', {
    header: 'Location',
    cell: (info) => (
      <span className="line-clamp-1 text-slate-900" title={info.getValue()}>
        {info.getValue()}
      </span>
    ),
    size: 280,
  }),
  columnHelper.accessor('magnitude', {
    header: 'Mag',
    cell: (info) => {
      const value = info.getValue();
      const style = magnitudeStyle(value);
      return (
        <span
          className={`inline-flex w-14 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${style.bg} ${style.text}`}
          title={style.label}
        >
          {formatNumber(value, 1)}
        </span>
      );
    },
    size: 80,
  }),
  columnHelper.accessor('depth', {
    header: 'Depth (km)',
    cell: (info) => (
      <span className="tabular-nums text-slate-700">{formatNumber(info.getValue(), 1)}</span>
    ),
    size: 100,
  }),
  columnHelper.accessor('latitude', {
    header: 'Lat',
    cell: (info) => (
      <span className="tabular-nums text-slate-700">{formatCoord(info.getValue())}</span>
    ),
    size: 90,
  }),
  columnHelper.accessor('longitude', {
    header: 'Lon',
    cell: (info) => (
      <span className="tabular-nums text-slate-700">{formatCoord(info.getValue())}</span>
    ),
    size: 100,
  }),
  columnHelper.accessor('significance', {
    header: 'Sig',
    cell: (info) => (
      <span className="tabular-nums text-slate-700">{formatInteger(info.getValue())}</span>
    ),
    size: 80,
  }),
  columnHelper.accessor('tsunami', {
    header: 'Tsunami',
    cell: (info) =>
      info.getValue() === 1 ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
          ⚠ Yes
        </span>
      ) : (
        <span className="text-xs text-slate-400">—</span>
      ),
    size: 90,
  }),
];

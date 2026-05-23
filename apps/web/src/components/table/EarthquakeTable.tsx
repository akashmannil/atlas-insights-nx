import { memo, useCallback, useEffect, useRef } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { EarthquakeRecord } from '@atlas/shared-types';
import { earthquakeColumns } from './columns';

interface EarthquakeTableProps {
  records: readonly EarthquakeRecord[];
  selectedId: string | null;
  hoveredId: string | null;
  onRowClick: (id: string) => void;
  onRowHover: (id: string | null) => void;
}

const ROW_HEIGHT = 44;

/**
 * Virtualized data table.
 *
 * Receives a *single page* of records from the parent (`<TablePanel>` slices
 * the dataset before passing it in). Virtualization here protects against
 * the user temporarily configuring a very large page size — and keeps row
 * reconciliation cheap during hover.
 *
 * When `selectedId` lands on a record inside the current page slice we scroll
 * the virtualizer to it. Cross-page Chart → Table sync (when the selection
 * is *outside* the current slice) is handled in `<TablePanel>` by jumping
 * the page first.
 */
const EarthquakeTableImpl = ({
  records,
  selectedId,
  hoveredId,
  onRowClick,
  onRowHover,
}: EarthquakeTableProps) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // `data` is passed by reference; TanStack Table memoizes internally as long
  // as we don't recreate the array on every render. The parent already
  // memoizes via `useFilteredEarthquakes`.
  const table = useReactTable({
    data: records as EarthquakeRecord[],
    columns: earthquakeColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  // Reverse-sync: when selection changes (e.g. user clicked a chart point),
  // bring that row into view. Scrolls only when out of viewport to avoid
  // jarring auto-scrolls during normal table interaction.
  useEffect(() => {
    if (!selectedId) return;
    const index = rows.findIndex((r) => r.original.id === selectedId);
    if (index < 0) return;
    virtualizer.scrollToIndex(index, { align: 'center', behavior: 'smooth' });
  }, [selectedId, rows, virtualizer]);

  const handleMouseLeaveBody = useCallback(() => onRowHover(null), [onRowHover]);

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return (
    <div
      ref={scrollRef}
      className="relative flex-1 overflow-auto"
      // Tabindex makes the scrolling region itself keyboard-reachable for
      // arrow-key scrolling — minor a11y win.
      tabIndex={0}
      role="region"
      aria-label="Earthquake records"
    >
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead className="sticky top-0 z-10 bg-surface-subtle">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  style={{ width: header.getSize() }}
                  className="border-b border-slate-200 bg-surface-subtle px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody onMouseLeave={handleMouseLeaveBody}>
          {/* Top spacer — pushes virtual rows down by the height of the rows
              above the viewport. */}
          {virtualRows.length > 0 && virtualRows[0] && (
            <tr style={{ height: virtualRows[0].start }} aria-hidden="true">
              <td colSpan={earthquakeColumns.length} />
            </tr>
          )}
          {virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index];
            if (!row) return null;
            const record = row.original;
            const isSelected = record.id === selectedId;
            const isHovered = record.id === hoveredId;
            return (
              <tr
                key={record.id}
                data-id={record.id}
                aria-selected={isSelected}
                onClick={() => onRowClick(record.id)}
                onMouseEnter={() => onRowHover(record.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onRowClick(record.id);
                  }
                }}
                tabIndex={0}
                style={{ height: ROW_HEIGHT }}
                className={`group cursor-pointer border-b border-slate-100 transition-colors ${
                  isSelected
                    ? 'bg-brand-50 outline outline-1 -outline-offset-1 outline-brand-300'
                    : isHovered
                      ? 'bg-slate-50'
                      : 'bg-white hover:bg-slate-50'
                } focus:outline-2 focus:outline-brand-400`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="border-b border-slate-100 px-3 align-middle"
                    style={{ width: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
          {/* Bottom spacer — pushes remaining unrendered rows. */}
          {virtualRows.length > 0 && (
            <tr
              style={{
                height:
                  totalSize -
                  ((virtualRows[virtualRows.length - 1]?.end ?? 0)),
              }}
              aria-hidden="true"
            >
              <td colSpan={earthquakeColumns.length} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export const EarthquakeTable = memo(EarthquakeTableImpl);
EarthquakeTable.displayName = 'EarthquakeTable';

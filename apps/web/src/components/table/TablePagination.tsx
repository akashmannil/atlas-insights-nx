import { memo, useMemo } from 'react';

interface TablePaginationProps {
  /** 0-indexed current page. */
  currentPage: number;
  /** Total page count (>= 1). */
  totalPages: number;
  /** First record's 1-indexed position on the current page. */
  rangeStart: number;
  /** Last record's 1-indexed position on the current page. */
  rangeEnd: number;
  /** Total records currently loaded into the FE (post-filter). */
  totalRecords: number;
  /** True when more pages are available on the server but not yet fetched. */
  hasMoreOnServer?: boolean;
  /** True while a background page fetch is in flight after a navigation click. */
  isFetching: boolean;
  onPageChange: (page: number) => void;
}

/**
 * Numbered pager with first / prev / next / last controls.
 *
 * Window: shows up to 7 page slots — current page in the middle when
 * possible, with ellipses bridging the gap to first/last. This is the
 * standard pagination pattern users expect (Google search results, GitHub
 * issue lists). Saves horizontal space without scrolling regardless of
 * dataset size.
 */
const TablePaginationImpl = ({
  currentPage,
  totalPages,
  rangeStart,
  rangeEnd,
  totalRecords,
  hasMoreOnServer = false,
  isFetching,
  onPageChange,
}: TablePaginationProps) => {
  const pages = useMemo(() => buildPageWindow(currentPage, totalPages), [currentPage, totalPages]);

  const canPrev = currentPage > 0;
  const canNext = currentPage < totalPages - 1;

  return (
    <nav
      aria-label="Table pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-surface-subtle px-4 py-3 text-xs"
    >
      <div className="flex items-center gap-2 text-slate-600">
        {totalRecords === 0 ? (
          <span>No records</span>
        ) : (
          <span>
            Showing{' '}
            <span className="font-semibold tabular-nums text-slate-900">
              {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()}
            </span>{' '}
            of{' '}
            <span className="font-semibold tabular-nums text-slate-900">
              {totalRecords.toLocaleString()}
            </span>
            {hasMoreOnServer && (
              <span
                className="ml-1 text-slate-400"
                title="More records are available on the server — navigate to the next page to load them."
              >
                +
              </span>
            )}
          </span>
        )}
        {isFetching && (
          <span className="flex items-center gap-1 text-slate-500" aria-live="polite">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500"
            />
            Loading…
          </span>
        )}
      </div>

      {totalPages > 1 && (
        <ul className="flex items-center gap-1" role="list">
          <PageButton
            label="First"
            ariaLabel="Go to first page"
            disabled={!canPrev}
            onClick={() => onPageChange(0)}
          >
            «
          </PageButton>
          <PageButton
            label="Previous"
            ariaLabel="Go to previous page"
            disabled={!canPrev}
            onClick={() => onPageChange(currentPage - 1)}
          >
            ‹
          </PageButton>

          {pages.map((entry, idx) =>
            entry === 'ellipsis' ? (
              <li key={`e-${idx}`} aria-hidden="true" className="px-1 text-slate-400">
                …
              </li>
            ) : (
              <PageButton
                key={entry}
                ariaLabel={`Go to page ${entry + 1}`}
                ariaCurrent={entry === currentPage ? 'page' : undefined}
                disabled={entry === currentPage}
                active={entry === currentPage}
                onClick={() => onPageChange(entry)}
              >
                {entry + 1}
              </PageButton>
            ),
          )}

          <PageButton
            label="Next"
            ariaLabel="Go to next page"
            disabled={!canNext}
            onClick={() => onPageChange(currentPage + 1)}
          >
            ›
          </PageButton>
          <PageButton
            label="Last"
            ariaLabel="Go to last page"
            disabled={!canNext}
            onClick={() => onPageChange(totalPages - 1)}
          >
            »
          </PageButton>
        </ul>
      )}
    </nav>
  );
};

export const TablePagination = memo(TablePaginationImpl);
TablePagination.displayName = 'TablePagination';

// ---------- internals ----------

interface PageButtonProps {
  children: React.ReactNode;
  ariaLabel: string;
  ariaCurrent?: 'page';
  label?: string;
  disabled?: boolean;
  active?: boolean;
  onClick: () => void;
}

const PageButton = ({
  children,
  ariaLabel,
  ariaCurrent,
  disabled = false,
  active = false,
  onClick,
}: PageButtonProps) => (
  <li>
    <button
      type="button"
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-7 min-w-[28px] items-center justify-center rounded-md border px-2 text-xs font-medium tabular-nums transition ${
        active
          ? 'border-brand-500 bg-brand-600 text-white shadow-sm'
          : 'border-slate-300 bg-white text-slate-700 hover:border-brand-400 hover:text-brand-700'
      } disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:text-slate-700`}
    >
      {children}
    </button>
  </li>
);

/**
 * Compute the page-number window: at most 7 entries, current page roughly
 * centered, ellipses where the window doesn't reach the ends.
 *
 * Examples (current/total):
 *   1/10   → 1 2 3 4 5 … 10
 *   5/10   → 1 … 4 5 6 … 10
 *   10/10  → 1 … 6 7 8 9 10
 *   3/4    → 1 2 3 4
 */
type PageEntry = number | 'ellipsis';

const buildPageWindow = (currentZero: number, totalPages: number): PageEntry[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const result: PageEntry[] = [0];

  const windowStart = Math.max(1, currentZero - 1);
  const windowEnd = Math.min(totalPages - 2, currentZero + 1);

  if (windowStart > 1) result.push('ellipsis');

  for (let i = windowStart; i <= windowEnd; i++) {
    result.push(i);
  }

  if (windowEnd < totalPages - 2) result.push('ellipsis');

  result.push(totalPages - 1);
  return result;
};

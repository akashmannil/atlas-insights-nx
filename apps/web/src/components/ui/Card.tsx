import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** When true, removes inner padding — useful when the body is a table/chart. */
  flush?: boolean;
}

/**
 * The single surface primitive. Every panel in the dashboard is a `Card` —
 * keeps spacing, radius, border, and shadow in lockstep.
 */
export const Card = ({
  title,
  description,
  actions,
  flush = false,
  className = '',
  children,
  ...rest
}: CardProps) => (
  <section
    className={`flex flex-col rounded-2xl border border-slate-200 bg-white shadow-card ${className}`}
    {...rest}
  >
    {(title || actions) && (
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          {title && (
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
    )}
    <div className={`flex min-h-0 flex-1 flex-col ${flush ? '' : 'p-5'}`}>{children}</div>
  </section>
);

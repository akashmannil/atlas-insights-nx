interface SkeletonProps {
  className?: string;
}

/**
 * Single shimmer primitive used to compose loading skeletons. Keeps the
 * animation definition (see tailwind.config.js) in one place.
 */
export const Skeleton = ({ className = '' }: SkeletonProps) => (
  <div
    aria-hidden="true"
    className={`animate-shimmer rounded-md bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-[length:800px_100%] ${className}`}
  />
);

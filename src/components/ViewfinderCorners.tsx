import { cn } from '@/lib/utils';

const Corner = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={cn('pointer-events-none absolute h-4 w-4', className)} aria-hidden="true">
    <path d="M15.25 0.75 H0.75 V15.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" fill="none" />
  </svg>
);

/**
 * Camera-viewfinder corner marks at the four corners of a positioned parent
 * (same geometry as /viewfinder-corner.svg). Parent needs `relative`.
 */
export default function ViewfinderCorners({ className }: { className?: string }) {
  return (
    <span className={cn('pointer-events-none absolute inset-0', className)} aria-hidden="true">
      <Corner className="left-0 top-0" />
      <Corner className="right-0 top-0 -scale-x-100" />
      <Corner className="bottom-0 left-0 -scale-y-100" />
      <Corner className="bottom-0 right-0 -scale-100" />
    </span>
  );
}

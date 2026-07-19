import { cn } from '@/lib/utils';

/** The brand ▶ — solid red triangle (matches /play-triangle.svg geometry). */
export default function PlayTriangle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('inline-block h-[0.6em] w-[0.6em] shrink-0', className)} aria-hidden="true">
      <path d="M7 4.5 L19 12 L7 19.5 Z" fill="currentColor" />
    </svg>
  );
}

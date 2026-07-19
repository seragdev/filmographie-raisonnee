import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * Film-grain overlay — inline feTurbulence fractal noise (baseFrequency 0.8,
 * 3 octaves) at ~3.5% opacity. Decorative only; pointer-events none.
 * Place inside a `relative` section (hero, full-bleed ink bands).
 */
export default function Grain({ className, opacity = 0.035 }: { className?: string; opacity?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
      style={{ opacity }}
      aria-hidden="true"
      focusable="false"
    >
      <filter id={`gr-${id}`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#gr-${id})`} />
    </svg>
  );
}

import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * Horizontal film-strip edge band — currentColor strip with paper-colored
 * sprocket holes (8×12, 2px radius, 24px pitch). Same geometry as
 * /sprocket-band.svg, inlined so currentColor adapts to the theme.
 */
export default function SprocketBand({ className }: { className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg className={cn('block h-4 w-full', className)} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={`sp-${id}`} width="24" height="16" patternUnits="userSpaceOnUse">
          <rect width="24" height="16" fill="currentColor" />
          <rect x="8" y="2" width="8" height="12" rx="2" fill="var(--paper)" />
        </pattern>
      </defs>
      <rect width="100%" height="16" fill={`url(#sp-${id})`} />
    </svg>
  );
}

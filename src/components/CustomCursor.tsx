import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { prefersReducedMotion } from '@/lib/scroll';
import { cn } from '@/lib/utils';

/**
 * Custom cursor (design.md §5) — 10px red dot, lerped 0.15; expands into a
 * 28px viewfinder frame with a mono label over interactive elements.
 * Desktop (pointer: fine) only; native cursor stays as fallback elsewhere.
 */
export default function CustomCursor() {
  const [enabled] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(pointer: fine)').matches &&
      !prefersReducedMotion(),
  );
  const [label, setLabel] = useState<string | null>(null);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 900, damping: 70, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 900, damping: 70, mass: 0.6 });

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add('custom-cursor');

    const onMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    const onOver = (e: MouseEvent) => {
      const t = (e.target as HTMLElement).closest?.('a, button, [role="button"], input, select, [data-cursor]') as
        | HTMLElement
        | null;
      if (!t) {
        setLabel(null);
        return;
      }
      setLabel(t.dataset.cursor ?? (t.tagName === 'A' ? 'LINK' : t.tagName === 'INPUT' ? 'TYPE' : 'OPEN'));
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseover', onOver, { passive: true });
    return () => {
      document.documentElement.classList.remove('custom-cursor');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', onOver);
    };
  }, [x, y, enabled]);

  if (!enabled) return null;

  const cornerCls = 'absolute h-1.5 w-1.5 border-red';
  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-[95]"
      style={{ x: sx, y: sy }}
      aria-hidden="true"
    >
      {/* red dot */}
      <div
        className={cn(
          'absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-red transition-opacity duration-150',
          label ? 'opacity-0' : 'opacity-100',
        )}
        style={{ width: 10, height: 10 }}
      />
      {/* viewfinder frame */}
      <div
        className={cn(
          'absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-150',
          label ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
        )}
        style={{ width: 28, height: 28 }}
      >
        <span className={cn(cornerCls, 'left-0 top-0 border-l-[1.5px] border-t-[1.5px]')} />
        <span className={cn(cornerCls, 'right-0 top-0 border-r-[1.5px] border-t-[1.5px]')} />
        <span className={cn(cornerCls, 'bottom-0 left-0 border-b-[1.5px] border-l-[1.5px]')} />
        <span className={cn(cornerCls, 'bottom-0 right-0 border-b-[1.5px] border-r-[1.5px]')} />
      </div>
      {label && (
        <span className="absolute left-0 top-[22px] -translate-x-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.08em] text-red">
          {label}
        </span>
      )}
    </motion.div>
  );
}

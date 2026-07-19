import type Lenis from 'lenis';

/** Site-wide Lenis instance (created once in Layout) + scroll helpers. */
let lenis: Lenis | null = null;

export const setLenis = (l: Lenis | null) => {
  lenis = l;
};
export const getLenis = () => lenis;

export const scrollLock = (locked: boolean) => {
  if (locked) {
    lenis?.stop();
    document.body.style.overflow = 'hidden';
  } else {
    lenis?.start();
    document.body.style.overflow = '';
  }
};

export const scrollToTarget = (target: string | number | HTMLElement) => {
  if (lenis) {
    lenis.scrollTo(target as never, { duration: 1.2 });
  } else if (typeof target === 'number') {
    window.scrollTo({ top: target, behavior: 'smooth' });
  } else if (typeof target === 'string') {
    document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
  } else {
    target.scrollIntoView({ behavior: 'smooth' });
  }
};

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

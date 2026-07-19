import { prefersReducedMotion } from '@/lib/scroll';

export const LOADER_SESSION_KEY = 'fr-loader-seen';
export const LOADER_DONE_EVENT = 'fr-loader-done';

/** Will the leader-countdown loader play during this page load? */
export const loaderWillPlay = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (prefersReducedMotion()) return false;
  try {
    return !sessionStorage.getItem(LOADER_SESSION_KEY);
  } catch {
    return false;
  }
};

import { useCallback, useState } from 'react';

/** Screening-room (dark) theme — class strategy, persisted, OS-aware (init in index.html). */
export function useTheme() {
  const [dark, setDark] = useState<boolean>(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );

  const set = useCallback((next: boolean) => {
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('fr-theme', next ? 'dark' : 'light');
    } catch {
      /* private mode */
    }
    setDark(next);
  }, []);

  const toggle = useCallback(() => set(!document.documentElement.classList.contains('dark')), [set]);

  return { dark, toggle, set };
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { SearchContext } from '@/hooks/search';

/** Provides the global ⌘K search-overlay state (mounted once by Layout). */
export default function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  const value = useMemo(() => ({ open, setOpen, toggle }), [open, toggle]);
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

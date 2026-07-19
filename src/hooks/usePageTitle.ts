import { useEffect } from 'react';

const BASE = 'FILMOGRAPHIE RAISONNÉE';

/** Sets document.title; restores the base title on unmount. */
export default function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} — ${BASE}` : `${BASE} — Arab Women Filmmakers 1967–2020`;
    return () => {
      document.title = `${BASE} — Arab Women Filmmakers 1967–2020`;
    };
  }, [title]);
}

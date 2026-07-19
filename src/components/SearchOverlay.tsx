import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearch } from '@/hooks/search';
import { useFilmmakers, useProfiles, useTimeline } from '@/lib/data';
import { searchArchive, totalResults, highlightMatch } from '@/lib/search';
import type { SearchResult, ResultKind } from '@/lib/search';
import { scrollLock } from '@/lib/scroll';
import PlayTriangle from '@/components/PlayTriangle';
import { cn } from '@/lib/utils';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const GROUPS: { kind: ResultKind; label: string }[] = [
  { kind: 'filmmaker', label: 'FILMMAKERS' },
  { kind: 'film', label: 'FILMS' },
  { kind: 'profile', label: 'PROFILES' },
  { kind: 'event', label: 'EVENTS' },
];

function Highlight({ text, query }: { text: string; query: string }) {
  const parts = highlightMatch(text, query);
  if (!parts) return <>{text}</>;
  return (
    <>
      {parts.before}
      <span className="underline decoration-red decoration-2 underline-offset-2">{parts.match}</span>
      {parts.after}
    </>
  );
}

/** Search overlay — "The Catalog" (design.md §6.3). ⌘K / Search button. */
export default function SearchOverlay() {
  const { open, setOpen } = useSearch();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { data: filmmakers } = useFilmmakers();
  const { data: profiles } = useProfiles();
  const { data: timeline } = useTimeline();

  const results = useMemo(
    () => searchArchive(query, filmmakers, profiles, timeline, 6),
    [query, filmmakers, profiles, timeline],
  );
  const flat = useMemo(
    () => [...results.filmmaker, ...results.film, ...results.profile, ...results.event],
    [results],
  );
  const total = totalResults(results);

  // Reset query/cursor when the overlay opens (derived-state-during-render).
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery('');
      setCursor(0);
    }
  }
  // Reset keyboard cursor when the query changes (derived-state-during-render).
  const [prevQuery, setPrevQuery] = useState(query);
  if (prevQuery !== query) {
    setPrevQuery(query);
    setCursor(0);
  }

  useEffect(() => {
    if (open) {
      scrollLock(true);
      requestAnimationFrame(() => inputRef.current?.focus());
      const onEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setOpen(false);
      };
      window.addEventListener('keydown', onEsc);
      return () => {
        window.removeEventListener('keydown', onEsc);
        scrollLock(false);
      };
    }
    scrollLock(false);
    return () => scrollLock(false);
  }, [open, setOpen]);

  // Flat keyboard-navigation index offset for each group.
  const groupOffsets = useMemo(() => {
    const lengths = GROUPS.map((g) => results[g.kind].length);
    const starts = lengths.map((_, i) => lengths.slice(0, i).reduce((a, b) => a + b, 0));
    return GROUPS.map((g, i) => ({ ...g, start: starts[i], items: results[g.kind] }));
  }, [results]);

  const openResult = (r: SearchResult) => {
    setOpen(false);
    navigate(r.to);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = flat[cursor] ?? flat[0];
      if (r) openResult(r);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="catalog-search"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[90] bg-paper/95 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Search the archive"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.98, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.98, y: 8 }}
            transition={{ duration: 0.24, ease: EASE }}
            className="mx-auto flex h-full w-full max-w-[760px] flex-col px-6 pt-[12vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="t-mono text-[0.6875rem] text-ink-2">
              Search the archive — names, variants, film titles
            </p>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="e.g. Saab, Jocelyne · Ḥiṣān āl-ṭayn · 1974"
              className="mt-4 w-full border-0 border-b-2 border-ink bg-transparent pb-3 font-display text-[1.75rem] font-medium uppercase caret-red outline-none placeholder:text-mute/50 focus:border-red"
              aria-label="Search query"
              autoComplete="off"
              spellCheck={false}
            />

            <div className="mt-6 flex-1 overflow-y-auto pb-8" role="listbox" aria-label="Results">
              {query.length >= 2 && total === 0 && (
                <div className="py-12 text-center">
                  <p className="t-mono text-mute">— Non renseigné —</p>
                  <button type="button" className="chip mt-4" onClick={() => setQuery('')}>
                    Reset query
                  </button>
                </div>
              )}
              {groupOffsets.map(({ kind, label, start, items }) => {
                if (!items.length) return null;
                return (
                  <div key={kind} className="mb-6">
                    <p className="t-mono border-b border-line pb-2 text-[0.6875rem] text-mute">
                      {label} <span className="text-red">{items.length}</span>
                    </p>
                    <ul>
                      {items.map((r, i) => {
                        const idx = start + i;
                        return (
                          <motion.li
                            key={r.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03, duration: 0.25, ease: EASE }}
                          >
                            <button
                              type="button"
                              role="option"
                              aria-selected={idx === cursor}
                              className={cn(
                                'group flex w-full items-baseline gap-3 px-2 py-2.5 text-left transition-colors duration-150',
                                idx === cursor ? 'bg-paper-2' : 'hover:bg-paper-2',
                              )}
                              onMouseEnter={() => setCursor(idx)}
                              onClick={() => openResult(r)}
                            >
                              <PlayTriangle
                                className={cn(
                                  'h-[0.55rem] w-[0.55rem] shrink-0 self-center text-red transition-opacity duration-150',
                                  idx === cursor ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                                )}
                              />
                              <span className="font-display text-[1.1rem] font-medium uppercase leading-tight">
                                <Highlight text={r.title} query={query} />
                              </span>
                              <span className="t-mono ml-auto shrink-0 text-[0.625rem] text-mute">{r.context}</span>
                            </button>
                          </motion.li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>

            <p className="t-mono border-t border-line py-4 text-[0.625rem] text-mute">
              ↑↓ Navigate · ↵ Open · Esc Close
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

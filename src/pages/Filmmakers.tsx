import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import usePageTitle from '@/hooks/usePageTitle';
import type { Filmmaker } from '@/lib/data';
import { COUNTRIES, countryLabel, entryNumber, normalizeQuery, useFilmmakers } from '@/lib/data';
import { scrollToTarget } from '@/lib/scroll';
import PlayTriangle from '@/components/PlayTriangle';
import CitationFooter from '@/components/filmmakers/CitationFooter';
import FilterBar, {
  type CountryFilter,
  type DecadeFilter,
  type SortMode,
} from '@/components/filmmakers/FilterBar';
import LetterRail from '@/components/filmmakers/LetterRail';
import { SplitChars } from '@/components/filmmakers/common';
import {
  EASE,
  activeDecades,
  filmSpan,
  hasArabic,
  matchesQuery,
} from '@/components/filmmakers/utils';

type Item = { fm: Filmmaker; index: number };
interface Group {
  key: string;
  heading: string;
  sub: string;
  letter?: string;
  items: Item[];
}

const parseCountry = (v: string | null): CountryFilter =>
  v === 'egypt' || v === 'lebanon' || v === 'tunisia' ? v : 'all';
const parseDecade = (v: string | null): DecadeFilter => (v && /^\d{4}$/.test(v) ? Number(v) : 'all');
const parseSort = (v: string | null): SortMode => (v === 'entry' || v === 'films' ? v : 'az');

const sortKey = (fm: Filmmaker) => normalizeQuery(fm.sortName || fm.name);

/** One catalog row (filmmakers.md §3) — inverts to ink on hover. */
function EntryRow({ fm, index, delay, tabbable }: { fm: Filmmaker; index: number; delay: number; tabbable: boolean }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-5% 0px' }}
      transition={{ duration: 0.4, ease: EASE, delay }}
    >
      <Link
        to={`/filmmakers/${fm.slug}`}
        data-entry-row
        data-cursor="OPEN"
        tabIndex={tabbable ? 0 : -1}
        className="group grid min-h-[76px] grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-line px-2 py-4 transition-colors duration-150 hover:bg-ink hover:text-paper md:grid-cols-[64px_minmax(0,1.25fr)_minmax(0,1fr)_auto_auto_auto_24px] md:gap-x-4"
      >
        <span className="t-mono text-[0.75rem] text-mute transition-colors duration-150 group-hover:text-red">
          {entryNumber(index)}
        </span>
        <span className="min-w-0">
          <span className="font-display font-semibold uppercase leading-tight [font-size:clamp(1.25rem,2vw,1.6rem)]">
            {fm.name}
            {fm.hasProfile && (
              <span
                className="ml-2 inline-flex items-center align-middle text-red"
                title="Long-form profile available"
                aria-label="Long-form profile available"
              >
                <PlayTriangle className="h-[0.55em] w-[0.55em]" />
                <span className="font-mono text-[0.5em] font-semibold">+</span>
              </span>
            )}
          </span>
          {/* Mobile-only meta line */}
          <span className="t-mono mt-1 block text-[0.6875rem] text-mute transition-colors duration-150 group-hover:text-paper/70 md:hidden">
            {countryLabel(fm.country)} · {fm.films.length} FILMS · {filmSpan(fm)}
          </span>
        </span>
        <span className="t-mono hidden truncate text-[0.6875rem] normal-case text-mute transition-colors duration-150 group-hover:text-paper/70 md:block">
          {fm.variants.map((v, i) => (
            <span key={i} lang={hasArabic(v) ? 'ar' : undefined} dir={hasArabic(v) ? 'auto' : undefined}>
              {i > 0 && ' · '}
              {v}
            </span>
          ))}
        </span>
        <span className="t-micro hidden items-center border border-ink px-2 py-1 transition-colors duration-150 group-hover:border-paper/70 group-hover:text-paper/70 md:inline-flex">
          {countryLabel(fm.country)}
        </span>
        <span className="t-mono hidden text-[0.75rem] md:block">{fm.films.length} FILMS</span>
        <span className="t-mono hidden text-[0.75rem] text-mute transition-colors duration-150 group-hover:text-paper/70 md:block">
          {filmSpan(fm)}
        </span>
        <PlayTriangle className="h-[0.7rem] w-[0.7rem] -translate-x-2 self-center text-red opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100" />
      </Link>
    </motion.li>
  );
}

/** `/filmmakers` — the dictionary: 206 entries, filterable, citable. */
export default function Filmmakers() {
  usePageTitle('The Dictionary');
  const { data, loading } = useFilmmakers();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Filter state, initialized from URL params (shareable / citable views).
  const [country, setCountry] = useState<CountryFilter>(() => parseCountry(searchParams.get('country')));
  const [decade, setDecade] = useState<DecadeFilter>(() => parseDecade(searchParams.get('decade')));
  const [sort, setSort] = useState<SortMode>(() => parseSort(searchParams.get('sort')));
  const [q, setQ] = useState(() => searchParams.get('q') ?? '');
  const [appliedQ, setAppliedQ] = useState(() => searchParams.get('q') ?? '');
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const hashDone = useRef(false);

  // Debounced search (120ms).
  useEffect(() => {
    const t = setTimeout(() => setAppliedQ(q.trim()), 120);
    return () => clearTimeout(t);
  }, [q]);

  // URL sync.
  useEffect(() => {
    const p = new URLSearchParams();
    if (country !== 'all') p.set('country', country);
    if (decade !== 'all') p.set('decade', String(decade));
    if (appliedQ) p.set('q', appliedQ);
    if (sort !== 'az') p.set('sort', sort);
    setSearchParams(p, { replace: true });
  }, [country, decade, appliedQ, sort, setSearchParams]);

  const counts = useMemo<Record<CountryFilter, number>>(
    () => ({
      all: data.length,
      egypt: data.filter((f) => f.country === 'egypt').length,
      lebanon: data.filter((f) => f.country === 'lebanon').length,
      tunisia: data.filter((f) => f.country === 'tunisia').length,
    }),
    [data],
  );

  const decades = useMemo(() => {
    const s = new Set<number>();
    data.forEach((f) => activeDecades(f).forEach((d) => s.add(d)));
    return [...s].sort((a, b) => a - b);
  }, [data]);

  const filtered = useMemo<Item[]>(
    () =>
      data
        .map((fm, index) => ({ fm, index }))
        .filter(
          ({ fm }) =>
            (country === 'all' || fm.country === country) &&
            (decade === 'all' || activeDecades(fm).includes(decade)) &&
            matchesQuery(fm, appliedQ),
        ),
    [data, country, decade, appliedQ],
  );

  const sorted = useMemo<Item[]>(() => {
    const arr = [...filtered];
    if (sort === 'az') arr.sort((a, b) => sortKey(a.fm).localeCompare(sortKey(b.fm)));
    else if (sort === 'films')
      arr.sort((a, b) => b.fm.films.length - a.fm.films.length || sortKey(a.fm).localeCompare(sortKey(b.fm)));
    return arr;
  }, [filtered, sort]);

  const groups = useMemo<Group[]>(() => {
    if (sort === 'az') {
      const m = new Map<string, Item[]>();
      for (const it of sorted) {
        const first = sortKey(it.fm).charAt(0).toUpperCase();
        const key = /[A-Z]/.test(first) ? first : '#';
        const list = m.get(key);
        if (list) list.push(it);
        else m.set(key, [it]);
      }
      return [...m.keys()].sort().map((L) => {
        const items = m.get(L)!;
        return { key: L, heading: L, sub: `${items.length} ${items.length > 1 ? 'ENTRIES' : 'ENTRY'}`, letter: L, items };
      });
    }
    if (sort === 'entry') {
      return COUNTRIES.map((c) => {
        const items = sorted.filter((it) => it.fm.country === c.id);
        return {
          key: c.id,
          heading: c.labelFr,
          sub: `Nº ${c.range} · ${items.length} ${items.length > 1 ? 'ENTRIES' : 'ENTRY'}`,
          items,
        };
      }).filter((g) => g.items.length > 0);
    }
    return [
      {
        key: 'films',
        heading: 'By film count',
        sub: `${sorted.length} ${sorted.length > 1 ? 'ENTRIES' : 'ENTRY'}`,
        items: sorted,
      },
    ];
  }, [sorted, sort]);

  const letterMap = useMemo(() => {
    const m = new Map<string, number>();
    if (sort === 'az') for (const g of groups) if (g.letter) m.set(g.letter, g.items.length);
    return m;
  }, [groups, sort]);

  // Scroll-spy for the letter rail.
  useEffect(() => {
    if (sort !== 'az') return;
    const headers = Array.from(document.querySelectorAll<HTMLElement>('[data-letter-header]'));
    if (!headers.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) setActiveLetter(en.target.getAttribute('data-letter-header'));
        }
      },
      { rootMargin: '-170px 0px -70% 0px', threshold: 0 },
    );
    headers.forEach((h) => obs.observe(h));
    return () => obs.disconnect();
  }, [groups, sort]);

  // Deep link: /filmmakers?country=lebanon#letter-S
  useEffect(() => {
    if (loading || hashDone.current || !location.hash) return;
    let target: Element | null = null;
    try {
      target = document.querySelector(location.hash);
    } catch {
      target = null;
    }
    if (target) {
      hashDone.current = true;
      setTimeout(() => scrollToTarget(location.hash), 450);
    }
  }, [loading, location.hash, groups]);

  // "/" focuses search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable))
        return;
      e.preventDefault();
      document.getElementById('dictionary-search')?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filtersActive = country !== 'all' || decade !== 'all' || appliedQ !== '' || sort !== 'az';
  const reset = () => {
    setCountry('all');
    setDecade('all');
    setSort('az');
    setQ('');
    setAppliedQ('');
  };

  const summaryParts: string[] = [];
  if (country !== 'all') summaryParts.push(countryLabel(country));
  if (decade !== 'all') summaryParts.push(`${decade}S`);
  if (appliedQ) summaryParts.push(`“${appliedQ.toUpperCase()}”`);
  if (!summaryParts.length)
    summaryParts.push(sort === 'az' ? 'A–Z ORDER' : sort === 'entry' ? 'ORDERED AS THE THESIS' : 'BY FILM COUNT');

  const listKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const rows = Array.from(document.querySelectorAll<HTMLElement>('a[data-entry-row]'));
    const pos = rows.indexOf(document.activeElement as HTMLElement);
    if (pos < 0) return;
    e.preventDefault();
    const next = e.key === 'ArrowDown' ? Math.min(pos + 1, rows.length - 1) : Math.max(pos - 1, 0);
    rows[next]?.focus();
  };

  const jumpToLetter = (L: string) => {
    setActiveLetter(L);
    scrollToTarget(`#letter-${L}`);
  };

  return (
    <>
      {/* Section 1 — page header */}
      <section className="container-site pb-12 pt-24 md:pt-32" aria-label="The dictionary">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="t-kicker text-red"
        >
          Filmographie raisonnée — the dictionary chapter, pp. 730–972
        </motion.p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
          <h1 className="t-display-1">
            <SplitChars text="THE DICTIONARY" />
          </h1>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.25 }}
            className="t-mono text-right text-[0.75rem] leading-[1.9] text-ink-2"
          >
            <p className="text-ink">{counts.all || '—'} ENTRIES</p>
            <p>
              ÉGYPTE {counts.egypt || '—'} · LIBAN {counts.lebanon || '—'} · TUNISIE {counts.tunisia || '—'}
            </p>
            <p className="text-mute">ORDERED AS THE THESIS</p>
          </motion.div>
        </div>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.35 }}
          className="t-lede mt-8 max-w-[62ch]"
        >
          Every woman who directed at least one film in Tunisia, Egypt or Lebanon between 1967 and 2020, as
          catalogued by Mathilde Rouxel. Search any spelling — the index knows her transliteration variants.
        </motion.p>
      </section>

      {/* Section 2 — sticky filter bar */}
      <FilterBar
        q={q}
        onQ={setQ}
        country={country}
        onCountry={setCountry}
        decade={decade}
        onDecade={setDecade}
        sort={sort}
        onSort={setSort}
        counts={counts}
        decades={decades}
        filtersActive={filtersActive}
        onReset={reset}
        resultCount={filtered.length}
        total={data.length}
        summary={summaryParts.join(' · ')}
      />

      {/* Section 3 — the entry list */}
      <section className="container-site flex gap-10 pb-16 pt-8" aria-label="Entries">
        {sort === 'az' && !loading && filtered.length > 0 && (
          <LetterRail letters={letterMap} active={sort === 'az' ? activeLetter : null} onJump={jumpToLetter} />
        )}

        <div className="min-w-0 flex-1">
          {loading && (
            <ul aria-label="Loading entries" className="animate-pulse [animation-duration:1.2s]">
              {Array.from({ length: 8 }, (_, i) => (
                <li key={i} className="flex min-h-[76px] items-center gap-4 border-b border-line px-2 py-4">
                  <span className="h-3 w-10 bg-paper-2" />
                  <span className="h-5 w-1/3 bg-paper-2" />
                  <span className="ml-auto h-3 w-24 bg-paper-2" />
                </li>
              ))}
            </ul>
          )}

          {!loading && filtered.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center gap-4 py-24 text-center"
            >
              <p className="t-mono text-mute">— Non renseigné —</p>
              <p className="t-body">No entry matches these filters.</p>
              <button type="button" onClick={reset} className="btn-ghost" data-cursor="FILTER">
                Reset filters
              </button>
            </motion.div>
          )}

          {!loading &&
            groups.map((g) => (
              <section key={g.key} aria-label={`${g.heading} — ${g.sub}`} className="mb-10 last:mb-0">
                <motion.div
                  id={g.letter ? `letter-${g.letter}` : undefined}
                  data-letter-header={g.letter}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-25% 0px' }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="flex scroll-mt-48 items-baseline justify-between border-t-2 border-ink pt-3"
                >
                  <span className="font-display text-[2.5rem] font-semibold uppercase leading-none">{g.heading}</span>
                  <span className="t-mono text-[0.75rem] text-mute">{g.sub}</span>
                </motion.div>
                <ul onKeyDown={listKeyDown}>
                  {g.items.map((it, i) => (
                    <EntryRow
                      key={it.fm.slug}
                      fm={it.fm}
                      index={it.index}
                      delay={Math.min(i % 24, 15) * 0.03}
                      tabbable={i === 0}
                    />
                  ))}
                </ul>
              </section>
            ))}
        </div>
      </section>

      {/* Section 4 — index footer note + citation footer */}
      <section className="container-site pb-12" aria-label="About this index">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20% 0px' }}
          transition={{ duration: 0.6, ease: EASE }}
          className="border-t border-line pt-8"
        >
          <p className="t-mono max-w-[76ch] text-[0.75rem] normal-case leading-[1.9] text-ink-2">
            About this index — entries follow the thesis order (Égypte → Liban → Tunisie); catalog numbers Nº
            001–206 are this site's. Name variants in parentheses are the author's transliteration choices;
            Arabic-script forms are shown where documented. « — » marks data the source leaves as « non
            renseigné ».
          </p>
        </motion.div>
      </section>

      <CitationFooter
        reference="ROUXEL, MATHILDE (2020). FIGURES DU PEUPLE EN LUTTE. DES PIONNIÈRES DU CINÉMA ARABE AUX RÉALISATRICES POSTRÉVOLUTIONNAIRES (TUNISIE / ÉGYPTE / LIBAN, 1967–2020). « FILMOGRAPHIE RAISONNÉE », PP. 730–972. UNIVERSITÉ SORBONNE NOUVELLE – PARIS 3. HAL: TEL-03425456."
        extra={`THE DICTIONARY — ${counts.all || 206} ENTRIES · ÉGYPTE Nº 001–063 · LIBAN Nº 064–143 · TUNISIE Nº 144–206`}
        citeText={`Rouxel, Mathilde. "Filmographie raisonnée." In Figures du peuple en lutte. Des pionnières du cinéma arabe aux réalisatrices postrévolutionnaires (Tunisie / Égypte / Liban, 1967–2020), pp. 730–972. Université Sorbonne Nouvelle – Paris 3, 2020 — via Filmographie Raisonnée, ${typeof window !== 'undefined' ? window.location.origin : ''}/filmmakers.`}
      />
    </>
  );
}

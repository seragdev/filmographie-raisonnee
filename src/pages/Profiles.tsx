import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import usePageTitle from '@/hooks/usePageTitle';
import { COUNTRIES, normalizeQuery, useFilmmakers, useProfiles } from '@/lib/data';
import FilterBar from '@/components/profiles/FilterBar';
import ProfileCard from '@/components/profiles/ProfileCard';
import PullQuoteBand from '@/components/profiles/PullQuoteBand';
import CitationFooter from '@/components/profiles/CitationFooter';
import {
  collectThemes,
  isDirectInterview,
  orderProfiles,
  pickFlagshipQuote,
  profileCountry,
  resolveEntry,
  setMetaDescription,
  themeKey,
} from '@/components/profiles/profileUtils';
import type { Profile } from '@/lib/data';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const INTERSTITIAL_AFTER = 8;

/** `/profiles` — the 24 long-form Biographies et entretiens (profiles.md). */
export default function Profiles() {
  usePageTitle('Profiles & Interviews');
  const { data: profiles, loading } = useProfiles();
  const { data: filmmakers } = useFilmmakers();
  const [params, setParams] = useSearchParams();

  useEffect(
    () =>
      setMetaDescription(
        'Twenty-four Arab women filmmakers in their own words — biographies and thematic interviews gathered by Mathilde Rouxel (2020), pp. 972–1091.',
      ),
    [],
  );

  /* ------------------------- URL-synced filter state ------------------------- */
  const country = params.get('country');
  const theme = params.get('theme');
  const query = params.get('q') ?? '';

  const setParam = (key: string, value: string | null) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value == null || value === '') next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  };

  /* ------------------------------ Derived data ------------------------------ */
  const ordered = useMemo(() => orderProfiles(profiles), [profiles]);

  const entryBySlug = useMemo(() => {
    const map = new Map<string, ReturnType<typeof resolveEntry>>();
    for (const p of profiles) map.set(p.slug, resolveEntry(p, filmmakers));
    return map;
  }, [profiles, filmmakers]);

  const countryOf = useMemo(
    () => (p: Profile) => profileCountry(p, entryBySlug.get(p.slug) ?? null),
    [entryBySlug],
  );

  const countryFacets = useMemo(() => {
    const total = profiles.length;
    return [
      { id: null, label: 'All', count: total },
      ...COUNTRIES.map((c) => ({
        id: c.id as string,
        label: c.label,
        count: profiles.filter((p) => countryOf(p) === c.id).length,
      })),
    ];
  }, [profiles, countryOf]);

  const themes = useMemo(() => collectThemes(profiles), [profiles]);

  const filtered = useMemo(() => {
    const q = normalizeQuery(query);
    return ordered.filter((p) => {
      if (country && countryOf(p) !== country) return false;
      if (theme && !p.sections.some((s) => themeKey(s.heading) === theme)) return false;
      if (q && !normalizeQuery(p.name).includes(q)) return false;
      return true;
    });
  }, [ordered, country, theme, query, countryOf]);

  /** Anchor of the active theme inside a given profile (for deep links). */
  const anchorFor = (p: Profile): string | null => {
    if (!theme) return null;
    const i = p.sections.findIndex((s) => themeKey(s.heading) === theme);
    return i >= 0 ? `theme-${i}` : null;
  };

  /** Rotating flagship quote for the interstitial band (random per visit). */
  const interstitial = useMemo(
    () => (profiles.length ? pickFlagshipQuote(profiles) : null),
    [profiles],
  );

  /** Profiles whose chapters were not interviews with the filmmaker herself. */
  const indirect = useMemo(() => ordered.filter((p) => !isDirectInterview(p.interviewNote)), [ordered]);

  const splitGrid = filtered.length > INTERSTITIAL_AFTER && interstitial;
  const firstChunk = splitGrid ? filtered.slice(0, INTERSTITIAL_AFTER) : filtered;
  const secondChunk = splitGrid ? filtered.slice(INTERSTITIAL_AFTER) : [];

  const card = (p: Profile) => (
    <ProfileCard
      key={p.slug}
      profile={p}
      index={ordered.indexOf(p)}
      country={countryOf(p)}
      themeAnchor={anchorFor(p)}
    />
  );

  return (
    <article>
      {/* ------------------------- Section 1 — Header ------------------------- */}
      <header className="container-site pt-24 md:pt-32">
        <p className="t-kicker text-red">Biographies et entretiens — pp. 972–1091</p>
        <h1 className="t-display-1 mt-4" aria-label="Profiles & Interviews">
          {'PROFILES & INTERVIEWS'.split(' ').map((w, i) => (
            <motion.span
              key={i}
              className="inline-block"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.7, ease: EASE }}
            >
              {w}
              {i < 2 ? '\u00A0' : ''}
            </motion.span>
          ))}
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7, ease: EASE }}
          className="t-lede mt-6 max-w-[62ch] text-ink-2"
        >
          Twenty-four filmmakers, in their own words. Biographies and thematic interviews — most recorded by
          Mathilde Rouxel in 2016 — gathered as the closing chapter of the thesis. From Jocelyne Saab to Nadia
          El-Fani, these are the archive's longest reads.
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.7, ease: EASE }}
          className="t-mono mt-8 border-t border-line pt-4 text-[0.6875rem] text-mute"
        >
          {profiles.length || '—'} profiles —{' '}
          {COUNTRIES.map(
            (c) => `${c.labelFr} ${profiles.filter((p) => countryOf(p) === c.id).length}`,
          ).join(' · ')}{' '}
          · Quotes in French, as transcribed
        </motion.p>
      </header>

      {/* ------------------------ Section 2 — Filter bar ------------------------ */}
      {/* Direct child of <article> so the sticky bar has room to stick. */}
      <FilterBar
        countries={countryFacets}
        activeCountry={country}
        onCountry={(c) => setParam('country', c)}
        themes={themes}
        activeTheme={theme}
        onTheme={(k) => setParam('theme', k)}
        query={query}
        onQuery={(q) => setParam('q', q)}
        shown={filtered.length}
        total={profiles.length}
      />

      {/* ------------------------- Section 3 — The grid ------------------------- */}
      <section aria-label="Profile index" className="container-site pt-16">
        <p className="t-mono mb-8 text-[0.6875rem] text-mute">Ordered as the thesis</p>

        {loading ? (
          <p className="t-mono py-24 text-center text-mute">Chargement des profils…</p>
        ) : filtered.length === 0 ? (
          /* Empty state — "missing reel" pattern */
          <div className="border border-line py-24 text-center">
            <p className="t-mono text-mute">— Non renseigné —</p>
            <p className="t-mono-body mt-2 text-[0.8125rem] text-mute">
              No profile matches this combination of filters.
            </p>
            <button
              type="button"
              onClick={() => setParams(new URLSearchParams(), { replace: true })}
              data-cursor="FILTER"
              className="chip mt-6"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-8 pb-16 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">{firstChunk.map(card)}</AnimatePresence>
          </ul>
        )}
      </section>

      {/* --------------- Section 4 — Interstitial pull-quote --------------- */}
      {splitGrid && interstitial && (
        <PullQuoteBand
          quote={interstitial.quote}
          attribution={`${interstitial.name.toUpperCase()} — ROUXEL (2020), PP. 972–1091`}
          to={`/profiles/${interstitial.slug}#theme-${interstitial.sectionIndex}`}
        />
      )}

      {secondChunk.length > 0 && (
        <section aria-label="Profile index, continued" className="container-site">
          <ul className="grid grid-cols-1 gap-8 py-16 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">{secondChunk.map(card)}</AnimatePresence>
          </ul>
        </section>
      )}

      {/* ------------------- Section 5 — Method note + citation ------------------- */}
      <section aria-label="Method and source" className="container-site pb-32">
        <div className="grid gap-12 border-t border-line pt-16 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15% 0px' }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <p className="t-kicker text-red">A note on method</p>
            <p className="t-body mt-4 text-ink-2">
              {indirect.length} of the twenty-four
              {indirect.length > 0 && <> — {indirect.map((p) => p.name).join(', ')} — </>}
              could not be interviewed directly; their chapters are built from interviews conducted by others,
              or with their families, retranscribed and credited in the thesis. Provenance is stated on every
              profile.
            </p>
          </motion.div>
          <CitationFooter pageRange="PP. 972–1091" />
        </div>
      </section>
    </article>
  );
}

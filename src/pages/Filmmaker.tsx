import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { motion } from 'framer-motion';
import usePageTitle from '@/hooks/usePageTitle';
import type { Filmmaker } from '@/lib/data';
import { COUNTRIES, countryLabel, entryNumber, useFilmmakers, useProfiles } from '@/lib/data';
import { scrollToTarget } from '@/lib/scroll';
import Grain from '@/components/Grain';
import PlayTriangle from '@/components/PlayTriangle';
import CitationFooter from '@/components/filmmakers/CitationFooter';
import EntryCard from '@/components/filmmakers/EntryCard';
import FilmStrip from '@/components/filmmakers/FilmStrip';
import { Missing, SplitChars } from '@/components/filmmakers/common';
import {
  EASE,
  activeDecades,
  filmSpan,
  hasArabic,
  type FilmRecord,
} from '@/components/filmmakers/utils';
import { cn } from '@/lib/utils';

type BioSegment = string | { title: string; idx: number };

/** Split the bio so every film title documented in her filmography becomes an italic anchor. */
function linkBioTitles(bio: string, films: FilmRecord[]): BioSegment[] {
  const titles: { t: string; idx: number }[] = [];
  films.forEach((f, idx) => {
    for (const t of [f.titleFr, f.titleTranslit]) {
      if (t && t.length >= 4 && !titles.some((x) => x.t === t)) titles.push({ t, idx });
    }
  });
  titles.sort((a, b) => b.t.length - a.t.length);
  if (!titles.length) return [bio];
  const pattern = titles.map((x) => x.t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const map = new Map(titles.map((x) => [x.t, x.idx]));
  const re = new RegExp(`(${pattern})`, 'g');
  const out: BioSegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(bio))) {
    if (m.index > last) out.push(bio.slice(last, m.index));
    out.push({ title: m[0], idx: map.get(m[0])! });
    last = m.index + m[0].length;
  }
  if (last < bio.length) out.push(bio.slice(last));
  return out;
}

/** Transliteration variant chip — copies the spelling on click (filmmaker.md §1). */
function VariantChip({ value, delay }: { value: string; delay: number }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* clipboard unavailable — chip still gives visual feedback */
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1000);
  };
  const arabic = hasArabic(value);
  return (
    <motion.button
      type="button"
      onClick={copy}
      data-cursor="CITE"
      title="Copy this spelling"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: EASE, delay }}
      lang={arabic ? 'ar' : undefined}
      dir={arabic ? 'auto' : undefined}
      className={cn(
        't-mono border border-line-strong px-3 py-1.5 text-[0.75rem] normal-case transition-colors duration-150 hover:bg-paper-2',
        arabic && 'font-arabic text-[0.95rem]',
        copied && 'bg-paper-2 text-red',
      )}
    >
      {copied ? 'Copied' : value}
    </motion.button>
  );
}

/** `/filmmakers/:slug` — one dictionary entry: slate header, bio, the reel, citation. */
export default function Filmmaker() {
  const { slug } = useParams();
  const { data, loading } = useFilmmakers();
  const { data: profiles } = useProfiles();

  const index = useMemo(() => data.findIndex((f) => f.slug === slug), [data, slug]);
  const entry: Filmmaker | undefined = index >= 0 ? data[index] : undefined;

  usePageTitle(entry?.name ?? 'Entry');

  const [flashIndex, setFlashIndex] = useState<number | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );
  const jumpToFilm = (idx: number) => {
    scrollToTarget(`#film-${idx}`);
    setFlashIndex(idx);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashIndex(null), 900);
  };

  const films = useMemo(() => (entry ? (entry.films as FilmRecord[]) : []), [entry]);
  const bioSegments = useMemo(() => (entry ? linkBioTitles(entry.bio, films) : []), [entry, films]);

  const profileExists = useMemo(
    () => (entry ? profiles.some((p) => p.slug === entry.slug) : false),
    [profiles, entry],
  );
  const showProfile = !!entry?.hasProfile && profileExists;

  const countryInfo = entry ? COUNTRIES.find((c) => c.id === entry.country) : undefined;

  const sameCountry = useMemo(() => {
    if (!entry) return [];
    return data
      .map((fm, i) => ({ fm, i }))
      .filter((x) => x.fm.country === entry.country && x.fm.slug !== entry.slug)
      .sort((a, b) => Math.abs(a.i - index) - Math.abs(b.i - index))
      .slice(0, 3)
      .sort((a, b) => a.i - b.i);
  }, [data, entry, index]);

  const countryTotal = useMemo(
    () => (entry ? data.filter((f) => f.country === entry.country).length : 0),
    [data, entry],
  );

  const prev = data.length > 0 && index >= 0 ? data[(index - 1 + data.length) % data.length] : undefined;
  const next = data.length > 0 && index >= 0 ? data[(index + 1) % data.length] : undefined;
  const prevIndex = prev ? (index - 1 + data.length) % data.length : 0;
  const nextIndex = next ? (index + 1) % data.length : 0;

  // SEO: meta description from the bio's first sentence + JSON-LD Person.
  useEffect(() => {
    if (!entry) return;
    const firstSentence = entry.bio.split(/(?<=\.)\s/)[0]?.trim();
    const desc =
      firstSentence && firstSentence.length <= 300
        ? firstSentence
        : `${entry.name} — dictionary entry, Filmographie raisonnée (Rouxel 2020).`;
    const tag = document.querySelector('meta[name="description"]');
    const previous = tag?.getAttribute('content') ?? null;
    if (tag) tag.setAttribute('content', desc);
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: entry.name,
      alternateName: entry.variants,
      nationality: countryLabel(entry.country),
    });
    document.head.appendChild(ld);
    return () => {
      if (tag && previous != null) tag.setAttribute('content', previous);
      ld.remove();
    };
  }, [entry]);

  /* ------------------------------- Loading ------------------------------- */
  if (loading) {
    return (
      <div className="container-site animate-pulse pt-24 [animation-duration:1.2s] md:pt-[120px]" aria-label="Loading the entry">
        <div className="h-3 w-48 bg-paper-2" />
        <div className="mt-8 h-16 w-2/3 bg-paper-2" />
        <div className="mt-6 flex gap-2">
          <div className="h-8 w-28 bg-paper-2" />
          <div className="h-8 w-32 bg-paper-2" />
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 border-y border-line py-4 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-8 bg-paper-2" />
          ))}
        </div>
        <div className="mt-16 space-y-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-14 border-b border-line bg-paper-2/60" />
          ))}
        </div>
      </div>
    );
  }

  /* ------------------------------ Missing reel ---------------------------- */
  if (!entry) {
    return (
      <section className="container-site flex min-h-[60dvh] flex-col items-center justify-center gap-6 py-32 text-center">
        <p className="t-kicker text-red">Missing reel</p>
        <h1 className="t-display-2">— Non renseigné —</h1>
        <p className="t-body max-w-[52ch]">
          No dictionary entry matches « {slug} ». She may be catalogued under a different spelling — the index
          searches every documented variant.
        </p>
        <Link to="/filmmakers" className="btn-ghost" data-cursor="OPEN">
          Return to the dictionary <PlayTriangle className="text-red" />
        </Link>
      </section>
    );
  }

  const no = entryNumber(index);
  const span = filmSpan(entry);
  const decades = activeDecades(entry);

  return (
    <>
      {/* Section 1 — Entry header ("The Slate") */}
      <header className="container-site pt-24 md:pt-[120px]">
        <motion.nav
          aria-label="Breadcrumb"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="t-mono text-[0.6875rem] text-mute"
        >
          <Link to="/filmmakers" className="transition-colors hover:text-red" data-cursor="LINK">
            Dictionary
          </Link>
          <span className="mx-2 text-line-strong">/</span>
          <Link
            to={`/filmmakers?country=${entry.country}`}
            className="transition-colors hover:text-red"
            data-cursor="FILTER"
          >
            {countryInfo?.labelFr ?? countryLabel(entry.country)}
          </Link>
          <span className="mx-2 text-line-strong">/</span>
          <span aria-current="page" className="text-ink-2">
            {no}
          </span>
        </motion.nav>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
          className="mt-6 flex items-center gap-3"
        >
          <p className="t-mono text-[0.75rem] text-ink">
            Entrée {no} / {String(data.length).padStart(3, '0')}
          </p>
          <PlayTriangle className="text-red" />
          <span className="t-micro inline-flex items-center border border-ink px-2 py-1">
            {countryLabel(entry.country)}
          </span>
        </motion.div>

        <h1 className="mt-4 max-w-5xl font-display font-semibold uppercase leading-[0.95] [font-size:clamp(2.5rem,7vw,6rem)]">
          <SplitChars text={entry.name.toUpperCase()} stagger={0.02} />
        </h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.3 }}
          className="t-mono mt-3 text-[0.75rem] text-mute"
        >
          Dictionary order — {entry.sortName.toUpperCase()}
        </motion.p>

        {entry.variants.length > 0 && (
          <div
            className="mt-6 flex flex-wrap gap-2"
            title="Transliteration variants — the index searches all of them"
          >
            {entry.variants.map((v, i) => (
              <VariantChip key={i} value={v} delay={0.35 + i * 0.06} />
            ))}
          </div>
        )}

        {/* Spec strip */}
        <motion.dl
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.45 }}
          className="mt-10 grid grid-cols-2 gap-y-5 border-y border-line py-4 md:grid-cols-4"
        >
          <div>
            <dt className="t-mono text-[0.6875rem] text-mute">Pays</dt>
            <dd className="t-mono mt-1 text-[0.75rem]">{countryInfo?.labelFr ?? entry.country.toUpperCase()}</dd>
          </div>
          <div>
            <dt className="t-mono text-[0.6875rem] text-mute">Films</dt>
            <dd className="t-mono mt-1 text-[0.75rem]">{entry.films.length}</dd>
          </div>
          <div>
            <dt className="t-mono text-[0.6875rem] text-mute">Active</dt>
            <dd className="t-mono mt-1 text-[0.75rem]">{span === '—' ? <Missing /> : span}</dd>
          </div>
          <div>
            <dt className="t-mono text-[0.6875rem] text-mute">Profile</dt>
            <dd className="t-mono mt-1 text-[0.75rem]">
              {showProfile ? (
                <Link to={`/profiles/${entry.slug}`} data-cursor="OPEN" className="link-text">
                  Long-form available <PlayTriangle className="text-red" />
                </Link>
              ) : (
                <Missing />
              )}
            </dd>
          </div>
        </motion.dl>
      </header>

      {/* Section 2 — Biography + margin rail */}
      <section className="container-site grid gap-12 pb-16 pt-16 lg:grid-cols-12" aria-label="Biography">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20% 0px' }}
          transition={{ duration: 0.6, ease: EASE }}
          className="lg:col-span-8"
        >
          {entry.bio.trim() ? (
            <p className="t-body" lang="fr">
              {bioSegments.map((s, i) =>
                typeof s === 'string' ? (
                  <span key={i}>{s}</span>
                ) : (
                  <a
                    key={i}
                    href={`#film-${s.idx}`}
                    data-cursor="PLAY"
                    onClick={(e) => {
                      e.preventDefault();
                      jumpToFilm(s.idx);
                    }}
                    className="italic underline decoration-line underline-offset-4 transition-colors duration-150 hover:text-red hover:decoration-red"
                  >
                    {s.title}
                  </a>
                ),
              )}
            </p>
          ) : (
            <p className="t-mono text-mute">— Non renseigné —</p>
          )}
          <p className="t-mono mt-8 text-[0.6875rem] text-mute">
            Biographie — Rouxel (2020), « Filmographie raisonnée », pp. 730–972
          </p>
        </motion.div>

        {/* Margin rail — catalog facts (data-driven; the thesis carries no sidenotes here) */}
        <motion.aside
          initial={{ opacity: 0, x: 12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-20% 0px' }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.12 }}
          className="hidden xl:col-span-3 xl:col-start-10 xl:block"
        >
          <div className="space-y-6 border-l border-line pl-5">
            <div>
              <p className="t-mono text-[0.6875rem] text-mute">Section</p>
              <p className="t-mono-body mt-1 normal-case text-ink-2">
                {countryInfo?.labelFr ?? entry.country} — Nº {countryInfo?.range ?? '—'}
              </p>
            </div>
            <div>
              <p className="t-mono text-[0.6875rem] text-mute">Décennies actives</p>
              <p className="t-mono-body mt-1 text-ink-2">
                {decades.length ? decades.map((d) => `${d}s`).join(' · ') : '—'}
              </p>
            </div>
            <div>
              <p className="t-mono text-[0.6875rem] text-mute">Variantes</p>
              <p className="t-mono-body mt-1 normal-case text-ink-2">
                {entry.variants.length ? entry.variants.join(' · ') : '—'}
              </p>
            </div>
            <div>
              <p className="t-mono text-[0.6875rem] text-mute">Entretien</p>
              <p className="t-mono-body mt-1 text-ink-2">
                {showProfile ? (
                  <Link to={`/profiles/${entry.slug}`} data-cursor="OPEN" className="link-text">
                    Long-form profile <PlayTriangle className="text-red" />
                  </Link>
                ) : (
                  <Missing />
                )}
              </p>
            </div>
          </div>
        </motion.aside>
      </section>

      {/* Section 3 — Filmography ("The Reel") */}
      <section className="container-site pb-20" aria-label="Filmography">
        {films.length > 0 ? (
          <FilmStrip films={films} flashIndex={flashIndex} />
        ) : (
          <div>
            <h2 className="t-display-2">Filmographie — 0 film</h2>
            <p className="t-mono mt-8 border-t border-line pt-8 text-mute">— Non renseigné —</p>
          </div>
        )}
      </section>

      {/* Section 4 — Cross-links */}
      <section
        className={cn('container-site grid gap-6 pb-20', showProfile && 'lg:grid-cols-2')}
        aria-label="See also"
      >
        {showProfile && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20% 0px' }}
            transition={{ duration: 0.6, ease: EASE }}
            className="band-ink relative overflow-hidden p-8 md:p-10"
          >
            <Grain />
            <p className="t-kicker text-red">Biographies et entretiens</p>
            <p className="mt-4 max-w-[40ch] font-serif text-[1.125rem] leading-relaxed">
              Read her long-form portrait and interview — recorded by Mathilde Rouxel.
            </p>
            <Link
              to={`/profiles/${entry.slug}`}
              data-cursor="OPEN"
              className="t-micro mt-8 inline-flex items-center gap-2 border border-[#FAFAF7] px-6 py-3.5 text-[#FAFAF7] transition-colors duration-150 hover:bg-[#FAFAF7] hover:text-[#111111]"
            >
              Open the profile <PlayTriangle className="text-red" />
            </Link>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20% 0px' }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
        >
          <div className="flex items-baseline justify-between gap-4">
            <p className="t-kicker text-ink-2">
              Also from {countryInfo?.labelFr ?? countryLabel(entry.country)}
            </p>
            <Link
              to={`/filmmakers?country=${entry.country}`}
              data-cursor="FILTER"
              className="link-text t-mono shrink-0 text-[0.6875rem]"
            >
              View all {countryTotal} <PlayTriangle className="text-red" />
            </Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {sameCountry.map((x) => (
              <EntryCard key={x.fm.slug} filmmaker={x.fm} index={x.i} />
            ))}
          </div>
        </motion.div>
      </section>

      {/* Section 5 — Citation & provenance */}
      <CitationFooter
        reference="ROUXEL, MATHILDE (2020). FIGURES DU PEUPLE EN LUTTE. DES PIONNIÈRES DU CINÉMA ARABE AUX RÉALISATRICES POSTRÉVOLUTIONNAIRES (TUNISIE / ÉGYPTE / LIBAN, 1967–2020). « FILMOGRAPHIE RAISONNÉE », PP. 730–972. UNIVERSITÉ SORBONNE NOUVELLE – PARIS 3. HAL: TEL-03425456."
        extra={`ENTRÉE ${no} / ${String(data.length).padStart(3, '0')} — ${entry.sortName.toUpperCase()} · SECTION ${countryInfo?.labelFr ?? ''} (Nº ${countryInfo?.range ?? '—'}) · ${entry.films.length} ${entry.films.length > 1 ? 'FILMS' : 'FILM'}`}
        citeText={`Rouxel, Mathilde. "${entry.sortName}." In Figures du peuple en lutte. Des pionnières du cinéma arabe aux réalisatrices postrévolutionnaires (Tunisie / Égypte / Liban, 1967–2020), Filmographie raisonnée, pp. 730–972. Université Sorbonne Nouvelle – Paris 3, 2020 — via Filmographie Raisonnée, ${typeof window !== 'undefined' ? window.location.origin : ''}/filmmakers/${entry.slug}.`}
        provenance={`Auto-extracted from Rouxel (2020), « Filmographie raisonnée », pp. 730–972 · Entry ${no} · Corrections: about#contact`}
      />

      {/* Prev / Next */}
      <nav aria-label="Previous and next entries" className="border-t-2 border-ink">
        <div className="grid md:grid-cols-2">
          {prev && (
            <Link
              to={`/filmmakers/${prev.slug}`}
              data-cursor="OPEN"
              className="group flex items-center gap-3 border-b border-line px-6 py-6 transition-colors duration-150 hover:bg-paper-2 md:border-b-0 md:border-r md:px-12"
            >
              <PlayTriangle className="h-[0.7rem] w-[0.7rem] rotate-180 text-red transition-transform duration-150 group-hover:-translate-x-1" />
              <span className="t-mono text-[0.75rem] text-mute">{entryNumber(prevIndex)}</span>
              <span className="font-display text-[1.1rem] font-medium uppercase">{prev.sortName}</span>
            </Link>
          )}
          {next && (
            <Link
              to={`/filmmakers/${next.slug}`}
              data-cursor="OPEN"
              className="group flex items-center justify-end gap-3 px-6 py-6 text-right transition-colors duration-150 hover:bg-paper-2 md:px-12"
            >
              <span className="font-display text-[1.1rem] font-medium uppercase">{next.sortName}</span>
              <span className="t-mono text-[0.75rem] text-mute">{entryNumber(nextIndex)}</span>
              <PlayTriangle className="h-[0.7rem] w-[0.7rem] text-red transition-transform duration-150 group-hover:translate-x-1" />
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}

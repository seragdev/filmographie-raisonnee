import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { motion } from 'framer-motion';
import usePageTitle from '@/hooks/usePageTitle';
import { entryNumber, NR, useFilmmakers, useProfiles } from '@/lib/data';
import PlayTriangle from '@/components/PlayTriangle';
import ViewfinderCorners from '@/components/ViewfinderCorners';
import ProgressBar from '@/components/profiles/ProgressBar';
import FrenchText from '@/components/profiles/FrenchText';
import QuoteBlock from '@/components/profiles/QuoteBlock';
import PullQuoteBand from '@/components/profiles/PullQuoteBand';
import CitationFooter from '@/components/profiles/CitationFooter';
import ProfileCard from '@/components/profiles/ProfileCard';
import { TocDropdown, TocRail } from '@/components/profiles/Toc';
import type { TocItem } from '@/components/profiles/Toc';
import {
  countryLabelFr,
  entryIndexOf,
  filmItems,
  firstSentence,
  interviewLabel,
  orderProfiles,
  profileCountry,
  profileNumber,
  readingMinutes,
  resolveEntry,
  scrollToSection,
  setMetaDescription,
  splitFootnoteArtifacts,
  strongestQuote,
} from '@/components/profiles/profileUtils';
import type { Filmmaker } from '@/lib/data';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const CHAPTER = 'BIOGRAPHIES ET ENTRETIENS — PP. 972–1091';

/** `/profiles/:slug` — long-form profile template ×24 (profile.md). */
export default function Profile() {
  const { slug } = useParams();
  const location = useLocation();
  const { data: profiles, loading } = useProfiles();
  const { data: filmmakers } = useFilmmakers();

  /* ------------------------------ Derived data ------------------------------ */
  const ordered = useMemo(() => orderProfiles(profiles), [profiles]);
  const index = ordered.findIndex((p) => p.slug === slug);
  const profile = index >= 0 ? ordered[index] : null;
  const entry = useMemo(() => (profile ? resolveEntry(profile, filmmakers) : null), [profile, filmmakers]);
  const entryIdx = entryIndexOf(entry, filmmakers);
  const country = useMemo(() => (profile ? profileCountry(profile, entry) : null), [profile, entry]);
  const countryFr = countryLabelFr(country);

  const standfirst = profile?.bio[0] ? firstSentence(profile.bio[0], 300) : '';
  const minutes = profile ? readingMinutes(profile) : 0;
  const films = useMemo(() => (profile ? filmItems(profile.filmographyLine) : []), [profile]);
  const filmCount = entry?.films.length ?? films.length;

  usePageTitle(profile ? `${profile.name} — Profile & Interview` : 'Profile');
  useEffect(() => {
    if (!profile) return;
    return setMetaDescription(
      `${profile.name} — biography and interview from Mathilde Rouxel's 2020 thesis. ${standfirst}`,
    );
  }, [profile, standfirst]);

  /* --------------------------------- TOC --------------------------------- */
  const tocItems: TocItem[] = useMemo(() => {
    if (!profile) return [];
    const list: TocItem[] = [
      { id: 'biographie', label: '01 BIOGRAPHIE' },
      { id: 'filmographie', label: '02 FILMOGRAPHIE' },
    ];
    profile.sections.forEach((s, i) => {
      const n = String(3 + i).padStart(2, '0');
      list.push({
        id: `theme-${i}`,
        label: `${i === 0 ? `${n} ENTRETIEN — ` : `${n} `}${s.heading.toUpperCase()}`,
        fr: true,
      });
    });
    list.push({ id: 'sources', label: `${String(3 + profile.sections.length).padStart(2, '0')} SOURCES` });
    return list;
  }, [profile]);

  const [activeId, setActiveId] = useState('biographie');

  // Scroll-spy — the section crossing the reading line becomes active.
  useEffect(() => {
    if (!profile) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActiveId(e.target.id);
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    );
    for (const item of tocItems) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [tocItems, profile]);

  // Deep links (/profiles/slug#theme-2) — scroll once the data has rendered.
  useEffect(() => {
    if (loading || !profile || !location.hash) return;
    const t = window.setTimeout(() => scrollToSection(location.hash.slice(1)), 400);
    return () => window.clearTimeout(t);
  }, [loading, profile, location.hash]);

  /* --------------------------- Margin (sidenote) rail --------------------------- */
  const railNotes = useMemo(() => {
    if (!profile) return [];
    const notes: { value: string; context: string }[] = [];
    for (const para of profile.bio) {
      for (const seg of splitFootnoteArtifacts(para)) {
        if (seg.kind === 'note') notes.push({ value: seg.value, context: 'BIOGRAPHIE' });
      }
    }
    for (const seg of splitFootnoteArtifacts(profile.interviewNote)) {
      if (seg.kind === 'note') notes.push({ value: seg.value, context: 'ENTRETIEN' });
    }
    return notes;
  }, [profile]);

  /* ------------------------------ Prev / next ------------------------------ */
  const prev = profile && ordered.length > 1 ? ordered[(index - 1 + ordered.length) % ordered.length] : null;
  const next = profile && ordered.length > 1 ? ordered[(index + 1) % ordered.length] : null;

  /* -------------------------------- Related -------------------------------- */
  const relatedProfiles = useMemo(() => {
    if (!profile || !country) return [];
    const sameCountry = ordered.filter((p) => profileCountry(p, resolveEntry(p, filmmakers)) === country);
    const pos = sameCountry.findIndex((p) => p.slug === profile.slug);
    const out: typeof sameCountry = [];
    for (let k = 1; k <= 2 && sameCountry.length > 1; k += 1) {
      const cand = sameCountry[(pos + k) % sameCountry.length];
      if (cand && cand.slug !== profile.slug && !out.includes(cand)) out.push(cand);
    }
    return out;
  }, [profile, country, ordered, filmmakers]);

  const relatedEntry: Filmmaker | null = useMemo(() => {
    if (!country) return null;
    return filmmakers.find((f) => f.country === country && f.slug !== entry?.slug && f.films.length > 0) ?? null;
  }, [country, filmmakers, entry]);

  /* --------------------------------- Render --------------------------------- */

  if (!loading && !profile) {
    return (
      <section className="container-site py-32 text-center">
        <p className="t-kicker text-red">Profile</p>
        <h1 className="t-display-2 mt-4">— Non renseigné —</h1>
        <p className="t-mono-body mx-auto mt-4 max-w-[52ch] text-mute">
          No profile exists at this address. It may have been misfiled.
        </p>
        <Link to="/profiles" data-cursor="OPEN" className="btn-ghost mt-8 inline-flex">
          All 24 profiles <PlayTriangle className="text-red" />
        </Link>
      </section>
    );
  }

  return (
    <article className="overflow-x-clip">
      <ProgressBar />

      {profile && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: `${profile.name} — Profile & Interview`,
              inLanguage: 'fr',
              author: { '@type': 'Person', name: 'Mathilde Rouxel' },
              isPartOf: {
                '@type': 'Thesis',
                name: 'Figures du peuple en lutte',
                author: 'Mathilde Rouxel',
                datePublished: '2020',
              },
              about: {
                '@type': 'Person',
                name: profile.name,
                birthDate: profile.birthYear ?? undefined,
                deathDate: profile.deathYear ?? undefined,
                nationality: countryFr ?? undefined,
              },
            }),
          }}
        />
      )}

      {/* ------------------------- Section 1 — Header ------------------------- */}
      <header className="container-site pt-16 md:pt-24">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="t-mono text-[0.6875rem] text-mute">
          <Link to="/profiles" data-cursor="OPEN" className="transition-colors hover:text-red">
            Profiles
          </Link>
          <span className="mx-2">/</span>
          {country ? (
            <>
              <Link
                to={`/profiles?country=${country}`}
                data-cursor="FILTER"
                className="transition-colors hover:text-red"
              >
                {countryFr}
              </Link>
              <span className="mx-2">/</span>
            </>
          ) : null}
          <span className="text-ink">Profil {profile ? profileNumber(index) : '—'}</span>
        </nav>

        <p className="t-kicker mt-10 text-red">{CHAPTER}</p>

        {/* Name — character split */}
        <h1
          aria-label={profile?.name ?? 'Profile'}
          className="mt-4 font-display font-semibold uppercase leading-[0.95] text-[clamp(2.75rem,8vw,7rem)]"
        >
          {(profile?.name ?? (loading ? '…' : '—')).split('').map((ch, i) => (
            <motion.span
              key={`${slug}-${i}`}
              aria-hidden="true"
              className="inline-block"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02, duration: 0.7, ease: EASE }}
            >
              {ch === ' ' ? ' ' : ch}
            </motion.span>
          ))}
        </h1>

        {/* Lifespan + dictionary cross-ref */}
        {profile && (
          <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-3">
            <span className="t-mono text-[0.8125rem] text-mute">
              ({profile.birthYear ?? '—'} ; {profile.deathYear ?? '–'})
            </span>
            {entry && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9, duration: 0.4, ease: EASE }}
              >
                <Link
                  to={`/filmmakers/${entry.slug}`}
                  data-cursor="OPEN"
                  className="t-mono inline-flex items-center gap-2 border border-ink px-3 py-1.5 text-[0.75rem] transition-colors duration-150 hover:bg-ink hover:text-paper"
                >
                  Entrée {entryNumber(entryIdx)} — Filmographie raisonnée <PlayTriangle className="text-red" />
                </Link>
              </motion.span>
            )}
          </div>
        )}

        {/* Standfirst */}
        {standfirst && (
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7, ease: EASE }}
            className="t-lede mt-8 max-w-[60ch] text-ink-2"
            lang="fr"
          >
            {standfirst}
          </motion.p>
        )}

        {/* Spec strip */}
        {profile && (
          <dl className="mt-12 grid grid-cols-2 border-y border-line lg:grid-cols-4">
            {[
              ['Pays', countryFr ?? NR],
              ['Films clés', String(filmCount)],
              [interviewLabel(profile.interviewNote), '—'],
              ['Lecture', `${minutes} min`],
            ].map(([k, v], i) => (
              <motion.div
                key={k}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 + i * 0.07, duration: 0.5, ease: EASE }}
                className="border-line px-4 py-4 [&:nth-child(odd)]:border-r lg:[&:not(:last-child)]:border-r"
              >
                <dt className="t-mono text-[0.6875rem] text-mute">{k}</dt>
                <dd className="t-mono mt-1 text-[0.8125rem]">{v}</dd>
              </motion.div>
            ))}
          </dl>
        )}
      </header>

      {/* Mobile contents dropdown — direct child of <article> so it stays sticky */}
      {profile && <TocDropdown items={tocItems} activeId={activeId} />}

      {/* ------------- Section 2 — Body (TOC + article + margin rail) ------------- */}
      {loading ? (
        <p className="t-mono container-site py-24 text-center text-mute">Chargement du profil…</p>
      ) : profile ? (
        <div className="container-site mt-16 grid gap-x-12 xl:grid-cols-12">
          {/* TOC rail */}
          <div className="hidden xl:col-span-2 xl:block">
            <TocRail items={tocItems} activeId={activeId} />
          </div>

          {/* Article */}
          <div className="min-w-0 xl:col-span-7">
            {/* 01 — Biographie */}
            <section id="biographie" aria-label="Biographie" className="scroll-mt-28">
              <h2 className="t-display-3 flex items-baseline gap-3">
                <span className="t-mono text-[0.75rem] text-red">01</span> Biographie
              </h2>
              <div className="mt-8 space-y-6">
                {profile.bio.map((para, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-20% 0px' }}
                    transition={{ delay: Math.min(i, 3) * 0.1, duration: 0.65, ease: EASE }}
                    className={
                      i === 0
                        ? 't-body-lg max-w-[68ch] first-letter:float-left first-letter:pr-3 first-letter:pt-[0.06em] first-letter:font-serif first-letter:text-[3.5em] first-letter:font-semibold first-letter:leading-[0.78]'
                        : 't-body-lg max-w-[68ch]'
                    }
                  >
                    <FrenchText text={para} />
                  </motion.p>
                ))}
              </div>
            </section>

            {/* 02 — Filmographie (mono strip) */}
            <section id="filmographie" aria-label="Filmographie" className="mt-24 scroll-mt-28">
              <h2 className="t-display-3 flex items-baseline gap-3">
                <span className="t-mono text-[0.75rem] text-red">02</span> Filmographie
              </h2>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-25% 0px' }}
                transition={{ duration: 0.6, ease: EASE }}
                className="mt-8 border border-line p-6"
              >
                <p className="t-mono-body text-ink-2" lang="fr">
                  {films.map((item, i) => (
                    <Fragment key={i}>
                      {i > 0 && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.5 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: Math.min(i, 12) * 0.02, duration: 0.3 }}
                          className="mx-2 inline-block"
                        >
                          <PlayTriangle className="text-red" />
                        </motion.span>
                      )}
                      {item}
                    </Fragment>
                  ))}
                </p>
              </motion.div>
              {entry && (
                <Link
                  to={`/filmmakers/${entry.slug}`}
                  data-cursor="OPEN"
                  className="link-text t-mono mt-6 inline-flex items-center gap-2 text-[0.75rem]"
                >
                  See the full filmography — {entry.films.length} films, frame by frame
                  <PlayTriangle className="text-red" />
                </Link>
              )}
            </section>

            {/* 03 — Entretien ("In her own words") */}
            <section aria-label="Entretien" className="mt-24">
              <h2 className="t-display-3 flex items-baseline gap-3">
                <span className="t-mono text-[0.75rem] text-red">03</span> Entretien — in her own words
              </h2>

              {/* Provenance box */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20% 0px' }}
                transition={{ duration: 0.6, ease: EASE }}
                className="mt-8 border border-ink p-6"
              >
                <p className="t-kicker text-mute">Provenance</p>
                <p className="t-mono-body mt-3 text-ink-2">
                  <FrenchText text={profile.interviewNote} />
                </p>
                <p className="t-mono-body mt-2 text-mute">— Rouxel (2020), pp. 972–1091.</p>
              </motion.div>

              {/* Thematic sections */}
              {profile.sections.map((section, i) => {
                const breaker =
                  i % 2 === 1 && i < profile.sections.length - 1
                    ? strongestQuote(profile, [i - 1, i])
                    : null;
                return (
                  <Fragment key={`${section.heading}-${i}`}>
                    <section id={`theme-${i}`} aria-label={section.heading} className="mt-20 scroll-mt-28">
                      <motion.h3
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-20% 0px' }}
                        transition={{ duration: 0.5, ease: EASE }}
                        className="t-display-3"
                        lang="fr"
                      >
                        <motion.span
                          initial={{ scale: 0.5, opacity: 0 }}
                          whileInView={{ scale: 1, opacity: 1 }}
                          viewport={{ once: true, margin: '-20% 0px' }}
                          transition={{ duration: 0.45, ease: EASE }}
                          className="mr-2 inline-block text-red"
                          aria-hidden="true"
                        >
                          «
                        </motion.span>
                        {section.heading}
                        <motion.span
                          initial={{ scale: 0.5, opacity: 0 }}
                          whileInView={{ scale: 1, opacity: 1 }}
                          viewport={{ once: true, margin: '-20% 0px' }}
                          transition={{ duration: 0.45, ease: EASE }}
                          className="ml-2 inline-block text-red"
                          aria-hidden="true"
                        >
                          »
                        </motion.span>
                      </motion.h3>
                      <div>
                        {section.quotes.map((q, j) => (
                          <QuoteBlock
                            key={j}
                            quote={q}
                            citation={`${profile.name.toUpperCase()} — ROUXEL (2020), PP. 972–1091`}
                            index={j}
                          />
                        ))}
                      </div>
                    </section>

                    {/* Pull-quote breaker — full-bleed splice over the layout */}
                    {breaker && (
                      <div className="relative left-1/2 z-10 my-20 w-screen -translate-x-1/2">
                        <PullQuoteBand
                          quote={breaker.quote}
                          attribution={`${profile.name.toUpperCase()} — ENTRETIEN · ROUXEL (2020)`}
                          to={`#theme-${breaker.sectionIndex}`}
                          cta="Back to the exchange"
                        />
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </section>

            {/* 04 — Sources */}
            <section id="sources" aria-label="Sources" className="mt-24 scroll-mt-28">
              <h2 className="t-display-3 flex items-baseline gap-3">
                <span className="t-mono text-[0.75rem] text-red">
                  {String(3 + profile.sections.length).padStart(2, '0')}
                </span>{' '}
                Sources
              </h2>
              <ol className="mt-8 space-y-3">
                {[
                  `Rouxel, Mathilde (2020). Figures du peuple en lutte. Des pionnières du cinéma arabe aux réalisatrices postrévolutionnaires, « Biographies et entretiens » — ${profile.name}, pp. 972–1091. Université Sorbonne Nouvelle – Paris 3. HAL tel-03425456.`,
                  entry
                    ? `Dictionary entry — ${entry.name}, Entrée ${entryNumber(entryIdx)}, « Filmographie raisonnée », pp. 730–972.`
                    : null,
                ]
                  .filter((s): s is string => Boolean(s))
                  .map((s, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-15% 0px' }}
                      transition={{ delay: i * 0.04, duration: 0.5, ease: EASE }}
                      className="t-mono-body flex gap-3 text-ink-2"
                    >
                      <sup className="mt-0.5 font-mono text-[0.75rem] font-semibold text-red">{i + 1}</sup>
                      <span lang="fr">{s}</span>
                    </motion.li>
                  ))}
              </ol>

              <div className="mt-12">
                <CitationFooter
                  pageRange="PP. 972–1091"
                  focus={`« BIOGRAPHIES ET ENTRETIENS » — ${profile.name.toUpperCase()}`}
                  provenance={profile.interviewNote}
                />
              </div>
            </section>
          </div>

          {/* Margin rail — rendered when the data carries footnote references */}
          <div className="hidden xl:col-span-3 xl:block">
            {railNotes.length > 0 && (
              <aside aria-label="Margin notes" className="sticky top-[120px]">
                <p className="t-kicker text-mute">Margin</p>
                <ul className="mt-4 space-y-4">
                  {railNotes.map((n, i) => (
                    <motion.li
                      key={`${n.value}-${i}`}
                      initial={{ opacity: 0, x: 12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.06, duration: 0.5, ease: EASE }}
                      className="t-mono-body border-l-2 border-red pl-3 text-[0.75rem] text-ink-2"
                    >
                      <sup className="mr-1 font-semibold text-red">{n.value}</sup>
                      Renvoi {n.value} — note de bas de page ({n.context.toLowerCase()}), Rouxel (2020).
                    </motion.li>
                  ))}
                </ul>
              </aside>
            )}
          </div>
        </div>
      ) : null}

      {/* ---------------------- Section 7 — Profile navigation ---------------------- */}
      {profile && (
        <nav aria-label="Profile navigation" className="container-site mt-28">
          <div className="grid gap-6 border-y border-line py-8 md:grid-cols-3 md:items-center">
            {prev ? (
              <Link
                to={`/profiles/${prev.slug}`}
                data-cursor="OPEN"
                className="group t-mono text-[0.75rem] text-ink-2 transition-colors hover:text-red"
              >
                <span aria-hidden="true" className="mr-2 inline-block transition-transform duration-150 group-hover:-translate-x-1">◀</span>
                Profil {profileNumber(ordered.indexOf(prev))} — {prev.name.toUpperCase()}
              </Link>
            ) : (
              <span />
            )}
            <Link
              to="/profiles"
              data-cursor="OPEN"
              className="link-text t-mono justify-self-center text-[0.75rem] max-md:order-first"
            >
              All {ordered.length || 24} profiles <PlayTriangle className="text-red" />
            </Link>
            {next ? (
              <Link
                to={`/profiles/${next.slug}`}
                data-cursor="OPEN"
                className="group t-mono text-right text-[0.75rem] text-ink-2 transition-colors hover:text-red md:justify-self-end"
              >
                {next.name.toUpperCase()} — Profil {profileNumber(ordered.indexOf(next))}
                <span aria-hidden="true" className="ml-2 inline-block transition-transform duration-150 group-hover:translate-x-1">▶</span>
              </Link>
            ) : (
              <span />
            )}
          </div>

          {/* Related — also from this country */}
          {(relatedProfiles.length > 0 || relatedEntry) && countryFr && (
            <section aria-label={`Also from ${countryFr}`} className="mt-16 pb-32">
              <p className="t-kicker text-red">Also from {countryFr}</p>
              <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {relatedProfiles.map((p) => (
                  <ProfileCard
                    key={p.slug}
                    profile={p}
                    index={ordered.indexOf(p)}
                    country={profileCountry(p, resolveEntry(p, filmmakers))}
                  />
                ))}
                {relatedEntry && (
                  <li>
                    <Link
                      to={`/filmmakers/${relatedEntry.slug}`}
                      data-cursor="OPEN"
                      className="group relative flex h-full flex-col border border-ink bg-paper p-6 transition-all duration-200 ease-cut hover:-translate-y-0.5 hover:border-2 hover:bg-paper-2"
                    >
                      <ViewfinderCorners className="text-mute opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                      <span className="t-mono text-[0.6875rem] text-mute">
                        Entrée {entryNumber(filmmakers.findIndex((f) => f.slug === relatedEntry.slug))} —{' '}
                        {countryLabelFr(relatedEntry.country) ?? NR}
                      </span>
                      <span className="mt-2 font-display text-[1.4rem] font-semibold uppercase leading-tight transition-colors duration-150 group-hover:text-red">
                        {relatedEntry.name}
                      </span>
                      {relatedEntry.variants.length > 0 && (
                        <span className="t-mono mt-1 text-[0.6875rem] text-mute" dir="auto">
                          {relatedEntry.variants[0]}
                        </span>
                      )}
                      <span className="flex-1" aria-hidden="true" />
                      <span className="t-mono mt-6 flex items-center justify-between border-t border-line pt-4 text-[0.6875rem] text-mute">
                        <span>
                          {relatedEntry.films.length} films
                          {(() => {
                            const years = relatedEntry.films.map((f) => f.year).filter((y): y is number => y != null);
                            return years.length ? ` · ${Math.min(...years)}–${Math.max(...years)}` : '';
                          })()}
                        </span>
                        <PlayTriangle className="text-red" />
                      </span>
                    </Link>
                  </li>
                )}
              </ul>
            </section>
          )}
        </nav>
      )}
    </article>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import Grain from '@/components/Grain';
import PlayTriangle from '@/components/PlayTriangle';
import SplitTitle from '@/components/features/SplitTitle';
import CitationFooter from '@/components/features/CitationFooter';
import TimelineControls from '@/components/features/timeline/TimelineControls';
import type { CountryFilter, Density, KindFilter } from '@/components/features/timeline/TimelineControls';
import TimelineChapter from '@/components/features/timeline/TimelineChapter';
import TimelineMinimap from '@/components/features/timeline/TimelineMinimap';
import { buildChapters, buildMinimap } from '@/components/features/timeline/timeline-utils';
import usePageTitle from '@/hooks/usePageTitle';
import { useFilmmakers, useTimeline } from '@/lib/data';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** `/timeline` — the full Chronologie 1940–2020 (timeline.md). */
export default function Timeline() {
  usePageTitle('Chronology');
  const { data: timeline, loading } = useTimeline();
  const { data: filmmakers, loading: filmsLoading } = useFilmmakers();

  const [country, setCountry] = useState<CountryFilter>('all');
  const [kind, setKind] = useState<KindFilter>('both');
  const [density, setDensity] = useState<Density>('key');
  const [openFilm, setOpenFilm] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState(0);

  const chapters = useMemo(() => buildChapters(timeline, filmmakers), [timeline, filmmakers]);
  const minimap = useMemo(() => buildMinimap(chapters), [chapters]);
  const ready = !loading && !filmsLoading && chapters.length > 0;

  // Reset the open film popover whenever filters change (derived-state-during-render pattern).
  const [prevFilters, setPrevFilters] = useState({ country, kind, density });
  if (prevFilters.country !== country || prevFilters.kind !== kind || prevFilters.density !== density) {
    setPrevFilters({ country, kind, density });
    setOpenFilm(null);
  }

  // Scroll-spy: which chapter is in the reading zone.
  useEffect(() => {
    if (!ready) return;
    const sections = chapters
      .map((ch) => document.getElementById(`chapter-${ch.index}`))
      .filter((el): el is HTMLElement => !!el);
    if (!sections.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActivePeriod(Number((e.target as HTMLElement).dataset.idx ?? 0));
        }
      },
      { rootMargin: '-35% 0px -55% 0px' },
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, [ready, chapters]);

  const periodRail = chapters.map((ch) => ({
    id: `chapter-${ch.index}`,
    numeral: ch.numeral,
    range: ch.range,
    short: ch.label.length <= 22 ? ch.label.toUpperCase() : '',
  }));

  return (
    <>
      {/* ------------------------------ §1 Header ------------------------------ */}
      <section className="relative">
        <Grain />
        <div className="container-site pb-14 pt-24 md:pt-32">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="t-kicker text-red"
          >
            Chronologie — pp. 721–730
          </motion.p>
          <h1 aria-label="1940 to 2020" className="t-display-1 mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="inline-flex">
              <SplitTitle text="1940" stagger={0.03} />
            </span>
            {/* The arrow draws — the page's single red accent */}
            <svg viewBox="0 0 72 24" className="h-[0.55em] w-auto text-red" aria-hidden="true">
              <motion.path
                d="M2 12 H64 M52 3 L66 12 L52 21"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="square"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.8, duration: 0.5, ease: EASE }}
              />
            </svg>
            <span className="inline-flex">
              <SplitTitle text="2020" stagger={0.03} delay={0.2} />
            </span>
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7, ease: EASE }}
            className="t-lede mt-6 max-w-[62ch] text-ink-2"
          >
            Above the line, the political events the thesis sets its filmmakers against. Below it, the films they
            released the same years. History and cinema, one scroll.
          </motion.p>

          {/* Legend */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.6, ease: EASE }}
            className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-line py-3 font-mono text-[0.7rem] uppercase tracking-[0.06em] text-mute"
          >
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 bg-ink" aria-hidden="true" /> Political event — thesis
            </span>
            <span className="inline-flex items-center gap-2">
              <PlayTriangle className="h-2.5 w-2.5 text-red" /> Film release — dictionary
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-3 w-0.5 bg-ink" aria-hidden="true" /> Spine draws as you scroll
            </span>
          </motion.div>
        </div>
      </section>

      {/* ---------------------------- §2 Controls bar ---------------------------- */}
      <TimelineControls
        periods={periodRail}
        activePeriod={activePeriod}
        country={country}
        setCountry={setCountry}
        kind={kind}
        setKind={setKind}
        density={density}
        setDensity={setDensity}
      />

      {/* ------------------------------ §3 The spine ----------------------------- */}
      {!ready && (
        <div className="container-site py-24">
          <p className="t-mono animate-pulse text-mute">Chargement de la chronologie…</p>
        </div>
      )}
      {ready &&
        chapters.map((ch) => (
          <TimelineChapter
            key={ch.index}
            chapter={ch}
            country={country}
            kind={kind}
            density={density}
            openFilm={openFilm}
            setOpenFilm={setOpenFilm}
          />
        ))}
      {ready && <TimelineMinimap model={minimap} />}

      {/* ---------------------------- §4 End of reel ----------------------------- */}
      <section className="band-ink relative overflow-hidden" aria-label="End of reel">
        <Grain />
        <div className="container-site flex flex-col items-center py-24 text-center md:py-28">
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-25% 0px' }}
            transition={{ duration: 0.8, ease: EASE }}
            className="font-display font-semibold uppercase leading-none text-[clamp(4rem,18vw,16rem)]"
            aria-label="Fin"
          >
            <SplitTitle text="FIN" stagger={0.04} />
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="t-mono mt-6 max-w-[62ch] text-[0.75rem] text-[#FAFAF7]/70"
          >
            The thesis closes in 2020. The archive does not — future sources will extend this spine.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.45, duration: 0.6, ease: EASE }}
            className="mt-10"
          >
            <Link
              to="/about"
              data-cursor="OPEN"
              className="inline-flex items-center gap-2 border border-[#FAFAF7] bg-transparent px-7 py-3.5 font-sans text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-[#FAFAF7] transition-colors duration-150 hover:bg-[#FAFAF7] hover:text-[#111111] active:scale-[0.97]"
            >
              Read the method <PlayTriangle className="text-red" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ------------------------- §5 Citation footer -------------------------- */}
      <CitationFooter
        pages="« CHRONOLOGIE », PP. 721–730"
        note="FILM RELEASE DATES ARE DRAWN FROM THE FILMOGRAPHIE RAISONNÉE ENTRIES, PP. 730–972."
      />
    </>
  );
}

import { Link } from 'react-router';
import { motion } from 'framer-motion';
import SprocketBand from '@/components/SprocketBand';
import { scrollToTarget } from '@/lib/scroll';
import { useMeta } from '@/lib/data';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const reveal = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-20% 0px' },
  transition: { delay: i * 0.08, duration: 0.7, ease: EASE },
});

const footerLink =
  'text-[#FAFAF7]/75 underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:text-[#FAFAF7] hover:decoration-red';

/** Footer — "End Credits" (design.md §6.2). Ink in both themes. */
export default function Footer() {
  const { data: meta } = useMeta();
  const year = new Date().getFullYear();
  const counts = meta?.counts;

  return (
    <footer className="band-ink" aria-label="Site footer">
      <div className="text-[#111111] dark:text-[#161613]">
        <SprocketBand />
      </div>

      <div className="container-site pb-8 pt-16">
        {/* 1 — Wordmark row */}
        <motion.div {...reveal(0)}>
          <p className="font-display font-semibold uppercase leading-none" style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}>
            Filmographie <span className="text-red">▶</span> Raisonnée
          </p>
          <p className="t-mono mt-4 text-[0.7rem] text-[#FAFAF7]/60">
            Arab women filmmakers — Tunisia / Egypt / Lebanon · 1967–2020
          </p>
        </motion.div>

        {/* 2 — Columns */}
        <motion.div {...reveal(1)} className="mt-14 grid gap-10 border-t border-[#FAFAF7]/20 pt-10 md:grid-cols-3">
          <nav aria-label="Index">
            <h3 className="t-kicker text-[#FAFAF7]/50">Index</h3>
            <ul className="mt-4 space-y-2 font-sans text-sm">
              <li><Link className={footerLink} to="/filmmakers">Filmmakers A–Z</Link></li>
              <li><Link className={footerLink} to="/profiles">Profiles &amp; Interviews</Link></li>
              <li><Link className={footerLink} to="/timeline">Chronology</Link></li>
              <li><Link className={footerLink} to="/references">References</Link></li>
            </ul>
          </nav>
          <nav aria-label="Source">
            <h3 className="t-kicker text-[#FAFAF7]/50">Source</h3>
            <ul className="mt-4 space-y-2 font-sans text-sm">
              <li><Link className={footerLink} to="/about">About &amp; Method</Link></li>
              <li>
                <a
                  className={footerLink}
                  href={meta?.thesis.halUrl ?? 'https://theses.hal.science/tel-03425456v1'}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  The thesis on HAL ↗
                </a>
              </li>
              <li><Link className={footerLink} to="/references">Citation format</Link></li>
            </ul>
          </nav>
          <div>
            <h3 className="t-kicker text-[#FAFAF7]/50">Colophon</h3>
            <p className="t-mono-body mt-4 max-w-[38ch] text-[#FAFAF7]/60">
              Built from: M. Rouxel, <em>Figures du peuple en lutte…</em>, Sorbonne Nouvelle – Paris 3, 2020.{' '}
              {counts
                ? `${counts.filmmakers} entries · ±${counts.films.toLocaleString('en-US')} films · ${counts.profiles} profiles.`
                : '206 entries · ±1,180 films · 24 profiles.'}
            </p>
          </div>
        </motion.div>

        {/* 3 — Citation strip */}
        <motion.p
          {...reveal(2)}
          className="t-mono mt-12 border-t border-[#FAFAF7]/20 pt-6 text-[0.625rem] leading-relaxed text-[#FAFAF7]/50"
        >
          Source — Rouxel, M. (2020). Figures du peuple en lutte. Université Sorbonne Nouvelle – Paris 3. NNT{' '}
          {meta?.thesis.nnt ?? '2020PA030072'} · HAL {meta?.thesis.halId ?? 'tel-03425456'}
        </motion.p>

        {/* 4 — Bottom bar */}
        <motion.div
          {...reveal(3)}
          className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#FAFAF7]/20 pt-6"
        >
          <p className="t-mono text-[0.625rem] text-[#FAFAF7]/50">
            © {year} Filmographie Raisonnée — an independent reading of one PhD
          </p>
          <button
            type="button"
            onClick={() => scrollToTarget(0)}
            className="t-mono text-[0.625rem] text-[#FAFAF7]/70 transition-colors duration-150 hover:text-[#FAFAF7]"
          >
            Back to top <span className="text-red">▲</span>
          </button>
        </motion.div>
      </div>
    </footer>
  );
}

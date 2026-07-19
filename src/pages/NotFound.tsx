import { Link } from 'react-router';
import { motion } from 'framer-motion';
import PlayTriangle from '@/components/PlayTriangle';
import usePageTitle from '@/hooks/usePageTitle';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** 404 — "Missing Reel" (design.md §6.10). */
export default function NotFound() {
  usePageTitle('Missing Reel');
  return (
    <section className="band-ink relative flex min-h-[70dvh] flex-col items-center justify-center px-6 py-24 text-center">
      {/* static film-leader circle */}
      <svg
        viewBox="0 0 480 480"
        className="pointer-events-none absolute h-[min(60vw,420px)] w-[min(60vw,420px)] text-[#FAFAF7]/20"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
      >
        <circle cx="240" cy="240" r="212" strokeWidth="2" />
        <path d="M0 240 H480 M240 0 V480" strokeWidth="1.5" />
        <circle cx="240" cy="240" r="7" fill="currentColor" stroke="none" />
      </svg>
      <h1 className="relative font-display font-semibold uppercase leading-none text-[#FAFAF7] text-[15vw] md:text-[10vw]">
        {'MISSING REEL'.split('').map((ch, i) => (
          <motion.span
            key={i}
            className="inline-block"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.5, ease: EASE }}
          >
            {ch === ' ' ? ' ' : ch}
          </motion.span>
        ))}
      </h1>
      <p className="t-mono relative mt-6 text-[0.75rem] text-[#FAFAF7]/60">
        Error 404 — this frame was never shot
      </p>
      <Link
        to="/"
        className="btn-ghost relative mt-10 border-[#FAFAF7] text-[#FAFAF7] hover:bg-[#FAFAF7] hover:text-ink"
        data-cursor="OPEN"
      >
        Return to the catalog <PlayTriangle className="text-red" />
      </Link>
    </section>
  );
}

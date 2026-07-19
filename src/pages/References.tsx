import { motion } from 'framer-motion';
import Grain from '@/components/Grain';
import SplitTitle from '@/components/features/SplitTitle';
import SourceCard from '@/components/features/references/SourceCard';
import Bibliography from '@/components/features/references/Bibliography';
import MethodNote from '@/components/features/references/MethodNote';
import FutureSources from '@/components/features/references/FutureSources';
import CiteSite from '@/components/features/references/CiteSite';
import usePageTitle from '@/hooks/usePageTitle';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** `/references` — the "refs tab": the one source, the thesis's bibliography, the method. */
export default function References() {
  usePageTitle('References');

  return (
    <>
      {/* ------------------------------ §1 Header ------------------------------ */}
      <section className="relative">
        <Grain />
        <div className="container-site pb-16 pt-24 md:pt-32">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="t-kicker text-red">
            Sources &amp; method
          </motion.p>
          <h1 className="t-display-1 mt-4" aria-label="References">
            <SplitTitle text="REFERENCES" />
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7, ease: EASE }}
            className="t-lede mt-6 max-w-[62ch] text-ink-2"
          >
            Every entry, profile and event on this site cites Mathilde Rouxel's 2020 thesis by page number. For
            now, it is the archive's only source — cited here in full, alongside the bibliography the thesis itself
            used.
          </motion.p>
        </div>
      </section>

      {/* ------------------------- §2 The Source (Nº 001) ------------------------ */}
      <section aria-label="The source" className="container-site pb-24">
        <SourceCard />
      </section>

      {/* ---------------------- §3 The thesis's bibliography --------------------- */}
      <section aria-label="The thesis's bibliography" className="container-site border-t-2 border-ink py-20">
        <Bibliography />
      </section>

      {/* ------------------------------ §4 Method -------------------------------- */}
      <section aria-label="Method" className="container-site border-t-2 border-ink py-20">
        <MethodNote />
      </section>

      {/* ---------------------------- §5 Future sources -------------------------- */}
      <section aria-label="Future sources" className="container-site border-t-2 border-ink py-20">
        <FutureSources />
      </section>

      {/* ----------------------------- §6 Cite this site ------------------------- */}
      <section aria-label="Cite this site" className="container-site pb-24">
        <CiteSite />
      </section>
    </>
  );
}

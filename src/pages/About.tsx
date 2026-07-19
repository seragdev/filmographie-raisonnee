import { Link } from 'react-router';
import { motion } from 'framer-motion';
import Grain from '@/components/Grain';
import PlayTriangle from '@/components/PlayTriangle';
import SplitTitle from '@/components/features/SplitTitle';
import CitationFooter from '@/components/features/CitationFooter';
import NumbersBand from '@/components/features/about/NumbersBand';
import Principles from '@/components/features/about/Principles';
import Roadmap from '@/components/features/about/Roadmap';
import Colophon from '@/components/features/about/Colophon';
import usePageTitle from '@/hooks/usePageTitle';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** `/about` — project statement, the name, the numbers, the principles, the roadmap (about.md). */
export default function About() {
  usePageTitle('About');
  const domain =
    typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'filmographie-raisonnee';

  return (
    <>
      {/* ------------------------------ §1 Header ------------------------------ */}
      <section className="relative">
        <Grain />
        <div className="container-site pb-16 pt-24 md:pt-32">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="t-kicker text-red">
            The project
          </motion.p>
          <h1 className="t-display-1 mt-4" aria-label="About the archive">
            <SplitTitle text="ABOUT THE ARCHIVE" />
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7, ease: EASE }}
            className="t-lede mt-6 max-w-[62ch] text-ink-2"
          >
            Filmographie Raisonnée is an independent web archive of Arab women filmmakers — Tunisia, Egypt,
            Lebanon, 1967–2020 — built from a single doctoral thesis and designed to outgrow it.
          </motion.p>
        </div>
      </section>

      {/* ------------------------------ §2 The Name ------------------------------ */}
      <section aria-label="Why the name" className="container-site border-t border-line py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2
              className="t-display-2 lg:sticky lg:top-[120px]"
              aria-label='Why "Filmographie Raisonnée"'
              lang="fr"
            >
              <SplitTitle text='WHY "FILMOGRAPHIE RAISONNÉE"' mode="words" />
            </h2>
            <motion.img
              src="/logo_main.png"
              alt="Filmographie Raisonnée — wordmark"
              width={240}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-15% 0px' }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
              className="mt-10 hidden w-[240px] lg:block"
              loading="lazy"
            />
          </div>
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20% 0px' }}
              transition={{ duration: 0.6, ease: EASE }}
              className="space-y-6"
            >
              <p className="t-body text-ink-2">
                A <em lang="fr">filmographie raisonnée</em> is a "reasoned" — annotated, justified — filmography:
                not a list, but a catalog with evidence. It is the title of the dictionary chapter of Mathilde
                Rouxel's thesis (
                <Link to="/references" className="link-text" data-cursor="OPEN">
                  pp. 730–972
                </Link>
                ), where 206 filmmakers and some 1,180 films are recorded with their titles in up to four forms,
                their credits, their archives.
              </p>
              <p className="t-body text-ink-2">
                We took the chapter's name for the site because the chapter <em>is</em> the site: the same entries,
                the same order, the same discipline — given a search box, a spine in history, and a voice.
              </p>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20% 0px' }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.12 }}
              className="mt-10 border-l-2 border-red pl-4 font-mono text-[0.7rem] uppercase leading-[1.8] tracking-[0.06em] text-mute"
            >
              Raisonnée — from raisonner, "to reason": each entry answers for its sources.
            </motion.p>
          </div>
        </div>
      </section>

      {/* ----------------------------- §3 The Numbers ---------------------------- */}
      <NumbersBand />

      {/* ----------------------------- §4 Principles ----------------------------- */}
      <section aria-label="Principles" className="container-site py-20">
        <Principles />
      </section>

      {/* ------------------------------ §5 Roadmap ------------------------------- */}
      <section aria-label="Roadmap" className="container-site border-t border-line py-20">
        <Roadmap />
      </section>

      {/* ------------------------------ §6 Colophon ------------------------------ */}
      <Colophon />

      {/* ------------------------ §7 Contact & corrections ------------------------ */}
      <section aria-label="Contact and corrections" className="container-site py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20% 0px' }}
          transition={{ duration: 0.6, ease: EASE }}
          className="flex flex-wrap items-center gap-x-8 gap-y-5"
        >
          <p className="t-body max-w-[52ch] text-ink-2">
            A correction, a source to suggest, a film to locate? Write to the archive.
          </p>
          <a href={`mailto:contact@${domain}`} className="btn-primary" data-cursor="LINK">
            Contact <PlayTriangle className="text-red" />
          </a>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.06em] text-mute">
            Corrections are logged and visible — see{' '}
            <Link to="/references" className="link-text" data-cursor="OPEN">
              /references#method
            </Link>
          </p>
        </motion.div>
      </section>

      {/* ---------------------------- Citation footer ---------------------------- */}
      <CitationFooter pages="« FILMOGRAPHIE RAISONNÉE », PP. 730–972 — ET PASSIM" />
    </>
  );
}

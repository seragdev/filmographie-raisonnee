import { useEffect } from 'react';
import { useLocation, useOutlet } from 'react-router';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Preloader from '@/components/Preloader';
import SearchOverlay from '@/components/SearchOverlay';
import CustomCursor from '@/components/CustomCursor';
import SearchProvider from '@/components/SearchProvider';
import { setLenis, getLenis, prefersReducedMotion } from '@/lib/scroll';

gsap.registerPlugin(ScrollTrigger);

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Shared layout — nested-route pattern (renders <Outlet/> via useOutlet, so
 * App.tsx MUST use nested <Route>s). Owns: Lenis smooth scroll synced to
 * GSAP ScrollTrigger, route-change scroll reset + trigger cleanup, and the
 * router-level "film splice" page transition. The nav is sticky (normal
 * flow), so pages need no top offset.
 */
export default function Layout() {
  const location = useLocation();
  const outlet = useOutlet();

  // Lenis smooth scroll (lerp 0.1) driven by the GSAP ticker.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const lenis = new Lenis({ lerp: 0.1 });
    setLenis(lenis);
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  // Route change: jump to top, kill orphaned ScrollTriggers, re-measure.
  useEffect(() => {
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
    ScrollTrigger.refresh();
    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [location.pathname]);

  const reduced = prefersReducedMotion();

  return (
    <SearchProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[110] focus:bg-ink focus:px-4 focus:py-2 focus:font-sans focus:text-xs focus:font-semibold focus:uppercase focus:tracking-[0.12em] focus:text-paper"
      >
        Skip to content
      </a>
      <Preloader />
      <CustomCursor />
      <Navbar />
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          id="main"
          key={location.pathname}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0, transition: { duration: 0.15 } } : { opacity: 0, transition: { duration: 0.08 } }}
          transition={reduced ? { duration: 0.15 } : { duration: 0.42, ease: EASE }}
          onAnimationComplete={() => ScrollTrigger.refresh()}
        >
          {outlet}
        </motion.main>
      </AnimatePresence>
      <Footer />
      <SearchOverlay />
    </SearchProvider>
  );
}

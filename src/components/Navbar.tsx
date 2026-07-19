import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useSearch } from '@/hooks/search';
import { scrollLock } from '@/lib/scroll';
import PlayTriangle from '@/components/PlayTriangle';

const NAV_ITEMS = [
  { label: 'FILMMAKERS', to: '/filmmakers' },
  { label: 'PROFILES', to: '/profiles' },
  { label: 'TIMELINE', to: '/timeline' },
  { label: 'REFERENCES', to: '/references' },
  { label: 'ABOUT', to: '/about' },
];

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Header — "The Slate Bar" (design.md §6.1). Sticky, in normal flow. */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { dark, toggle } = useTheme();
  const search = useSearch();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu on navigation (derived-state-during-render pattern).
  const [prevPath, setPrevPath] = useState(location.pathname);
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    setMenuOpen(false);
  }
  // Lock scroll while the menu is open.
  useEffect(() => {
    scrollLock(menuOpen);
    return () => scrollLock(false);
  }, [menuOpen]);

  return (
    <>
      <motion.header
        initial={{ y: '-100%' }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
        className={cn(
          'sticky top-0 z-50 border-b border-ink bg-paper transition-[height] [transition-duration:250ms]',
          scrolled ? 'h-12' : 'h-14',
        )}
      >
        <div className="container-site flex h-full items-center justify-between gap-4">
          {/* Wordmark */}
          <Link to="/" className="flex items-center gap-2.5" aria-label="Filmographie Raisonnée — home">
            <img src="/logo_avatar.png" alt="" width={28} height={28} className="h-7 w-7" />
            <span
              className={cn(
                'hidden font-display font-semibold uppercase tracking-[0.02em] sm:inline',
                scrolled ? 'text-[0.85rem]' : 'text-[0.95rem]',
              )}
            >
              Filmographie Raisonnée
            </span>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-6">
              {NAV_ITEMS.map((item, i) => (
                <motion.li
                  key={item.to}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 + i * 0.05, duration: 0.3 }}
                >
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'group inline-flex items-baseline gap-1 font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.14em] transition-colors duration-150 hover:text-red',
                        isActive && 'text-red',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <PlayTriangle
                          className={cn(
                            'h-[0.6em] w-[0.6em] self-center text-red transition-opacity duration-150',
                            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                          )}
                        />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                </motion.li>
              ))}
            </ul>
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => search.setOpen(true)}
              className="hidden items-center gap-2 border border-line-strong px-2.5 py-1.5 transition-colors duration-150 hover:border-red hover:text-red sm:inline-flex"
              aria-label="Search the archive (⌘K)"
            >
              <span className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.14em]">Search</span>
              <kbd className="t-mono border border-line px-1 py-0.5 text-[0.625rem] text-mute">⌘K</kbd>
            </button>

            <button
              type="button"
              onClick={toggle}
              className="inline-flex h-8 w-8 items-center justify-center border border-transparent transition-colors duration-150 hover:text-red"
              aria-label={dark ? 'Switch to reading room (light)' : 'Switch to screening room (dark)'}
              title={dark ? 'Reading room (light)' : 'Screening room (dark)'}
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10 2 a8 8 0 0 1 0 16 Z" fill="currentColor" />
              </svg>
            </button>

            <span
              className="t-micro hidden select-none items-center text-mute md:inline-flex"
              title="English UI live — Arabic locale planned"
            >
              <span className="text-ink">FR</span>
              <span className="mx-1 text-line-strong">|</span>
              <span className="text-mute/60">EN</span>
            </span>

            {/* Burger */}
            <button
              type="button"
              className="inline-flex h-8 w-8 flex-col items-center justify-center gap-1.5 lg:hidden"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className={cn('h-0.5 w-5 bg-ink transition-transform duration-200', menuOpen && 'translate-y-1 rotate-45')} />
              <span className={cn('h-0.5 w-5 bg-ink transition-transform duration-200', menuOpen && '-translate-y-1 -rotate-45')} />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile full-screen ink menu ("screening room") */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="band-ink fixed inset-0 z-[60] flex flex-col lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className="container-site flex h-14 items-center justify-between border-b border-[#FAFAF7]/20">
              <span className="font-display text-[0.95rem] font-semibold uppercase tracking-[0.02em]">Menu</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center text-2xl leading-none transition-colors hover:text-red"
                aria-label="Close menu"
              >
                ×
              </button>
            </div>
            <nav aria-label="Mobile" className="flex flex-1 flex-col justify-center">
              <ul className="container-site space-y-2">
                {[{ label: 'HOME', to: '/' }, ...NAV_ITEMS].map((item, i) => (
                  <motion.li
                    key={item.to}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.07, duration: 0.5, ease: EASE }}
                  >
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-baseline gap-3 font-display text-4xl font-semibold uppercase transition-colors duration-150 hover:text-red',
                          isActive && 'text-red',
                        )
                      }
                    >
                      <PlayTriangle className="h-[0.5em] w-[0.5em] self-center text-red opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                      {item.label}
                    </NavLink>
                  </motion.li>
                ))}
              </ul>
            </nav>
            <p className="container-site border-t border-[#FAFAF7]/20 py-4 t-mono text-[0.625rem] text-[#FAFAF7]/50">
              Source — Rouxel 2020 · Sorbonne Nouvelle – Paris 3 · HAL tel-03425456
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { scrollLock } from '@/lib/scroll';
import { LOADER_DONE_EVENT, LOADER_SESSION_KEY, loaderWillPlay } from '@/lib/loader';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Preloader — "Leader Countdown" (design.md §6.8). First visit per session
 * only; ~1.35s + 0.45s lift; skippable on click; skipped with reduced motion.
 * Dispatches LOADER_DONE_EVENT when the veil lifts so heroes can start.
 */
export default function Preloader() {
  const [show, setShow] = useState<boolean>(loaderWillPlay);
  const [count, setCount] = useState(3);
  const [flash, setFlash] = useState(false);
  const finished = useRef(false);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    setShow(false);
    scrollLock(false);
    window.dispatchEvent(new Event(LOADER_DONE_EVENT));
  }, []);

  useEffect(() => {
    if (!show) return;
    scrollLock(true);
    try {
      sessionStorage.setItem(LOADER_SESSION_KEY, '1');
    } catch {
      /* private mode */
    }
    const timers = [
      window.setTimeout(() => setCount(2), 400),
      window.setTimeout(() => setCount(1), 800),
      window.setTimeout(() => setFlash(true), 1200),
      window.setTimeout(finish, 1350),
    ];
    return () => {
      timers.forEach(clearTimeout);
      if (!finished.current) scrollLock(false);
    };
  }, [show, finish]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="leader-countdown"
          exit={{ y: '-100%' }}
          transition={{ duration: 0.45, ease: EASE }}
          className="band-ink fixed inset-0 z-[100] flex items-center justify-center"
          onClick={finish}
          role="presentation"
          aria-label="Loading"
        >
          <div className="relative h-[min(70vw,480px)] w-[min(70vw,480px)] text-[#FAFAF7]">
            {/* film-leader geometry (same as /film-leader.svg) with rotating sweep */}
            <svg viewBox="0 0 480 480" className="h-full w-full" fill="none" stroke="currentColor" aria-hidden="true">
              <circle cx="240" cy="240" r="212" strokeWidth="2" />
              <circle cx="240" cy="240" r="150" strokeWidth="1" opacity="0.5" />
              <path d="M0 240 H480 M240 0 V480" strokeWidth="1.5" opacity="0.8" />
              <g strokeWidth="1" opacity="0.5">
                <path d="M240 240 L389.8 90.2" />
                <path d="M240 240 L389.8 389.8" />
                <path d="M240 240 L90.2 389.8" />
                <path d="M240 240 L90.2 90.2" />
              </g>
              <g style={{ transformOrigin: '240px 240px', animation: 'fr-spin 1.2s linear infinite' }}>
                <path d="M240 240 L240 28" strokeWidth="2" />
              </g>
              <circle cx="240" cy="240" r="7" fill="currentColor" stroke="none" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {flash ? (
                <svg viewBox="0 0 24 24" className="h-16 w-16 text-red" aria-hidden="true">
                  <path d="M7 4.5 L19 12 L7 19.5 Z" fill="currentColor" />
                </svg>
              ) : (
                <span className="font-mono text-6xl font-medium tabular-nums" key={count}>
                  {count}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

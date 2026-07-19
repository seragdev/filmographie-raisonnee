import type { Filmmaker, Profile, TimelineData } from './data';
import { normalizeQuery, countryLabel } from './data';

/**
 * Client-side search over the archive JSON (names, variants, film titles,
 * profile names, chronology events). Shared by the ⌘K search overlay and the
 * home-page dictionary teaser.
 */

export type ResultKind = 'filmmaker' | 'film' | 'profile' | 'event';

export interface SearchResult {
  kind: ResultKind;
  id: string;
  /** Display title (may differ from the matched text, e.g. variant match). */
  title: string;
  /** Mono context line: country · films · years, etc. */
  context: string;
  /** Route to open. */
  to: string;
  /** The text that matched (for red-underline highlighting). */
  matched: string;
}

export type GroupedResults = Record<ResultKind, SearchResult[]>;

const filmYears = (f: Filmmaker): string => {
  const years = f.films.map((x) => x.year).filter((y): y is number => y != null);
  if (!years.length) return '';
  return `${Math.min(...years)}–${Math.max(...years)}`;
};

export function searchArchive(
  query: string,
  filmmakers: Filmmaker[],
  profiles: Profile[],
  timeline: TimelineData,
  perGroup = 6,
): GroupedResults {
  const q = normalizeQuery(query);
  const out: GroupedResults = { filmmaker: [], film: [], profile: [], event: [] };
  if (q.length < 2) return out;

  for (const fm of filmmakers) {
    if (out.filmmaker.length < perGroup) {
      const hay = [fm.name, fm.sortName, ...fm.variants];
      const hit = hay.find((h) => normalizeQuery(h).includes(q));
      if (hit) {
        const yrs = filmYears(fm);
        out.filmmaker.push({
          kind: 'filmmaker',
          id: `fm-${fm.slug}`,
          title: fm.name,
          context: [countryLabel(fm.country), `${fm.films.length} FILMS`, yrs].filter(Boolean).join(' · '),
          to: `/filmmakers/${fm.slug}`,
          matched: hit,
        });
      }
    }
    if (out.film.length < perGroup) {
      for (const film of fm.films) {
        const titles = [film.titleFr, film.titleTranslit, film.titleEn, film.titleDin].filter(
          (t): t is string => !!t,
        );
        const hit = titles.find((t) => normalizeQuery(t).includes(q));
        if (hit) {
          out.film.push({
            kind: 'film',
            id: `film-${fm.slug}-${film.year ?? 'x'}-${hit.slice(0, 12)}`,
            title: film.titleFr ?? hit,
            context: [film.year ? String(film.year) : '—', fm.name, countryLabel(fm.country)].join(' · '),
            to: `/filmmakers/${fm.slug}`,
            matched: hit,
          });
          break;
        }
      }
    }
    if (out.filmmaker.length >= perGroup && out.film.length >= perGroup) break;
  }

  for (const p of profiles) {
    if (out.profile.length >= perGroup) break;
    if (normalizeQuery(p.name).includes(q)) {
      out.profile.push({
        kind: 'profile',
        id: `pf-${p.slug}`,
        title: p.name,
        context: [p.country?.toUpperCase() ?? '', 'PROFILE & INTERVIEW'].filter(Boolean).join(' · '),
        to: `/profiles/${p.slug}`,
        matched: p.name,
      });
    }
  }

  for (const ev of timeline.events) {
    if (out.event.length >= perGroup) break;
    if (normalizeQuery(ev.label).includes(q) || normalizeQuery(ev.date).includes(q)) {
      out.event.push({
        kind: 'event',
        id: `ev-${ev.date}-${ev.label.slice(0, 16)}`,
        title: ev.label,
        context: `${ev.date} · CHRONOLOGY`,
        to: '/timeline',
        matched: ev.label,
      });
    }
  }

  return out;
}

export const totalResults = (g: GroupedResults): number =>
  g.filmmaker.length + g.film.length + g.profile.length + g.event.length;

/** Highlight the matched substring with a 2px red underline. */
export function highlightMatch(text: string, query: string): { before: string; match: string; after: string } | null {
  const nq = normalizeQuery(query);
  if (!nq) return null;
  const nt = normalizeQuery(text);
  const i = nt.indexOf(nq);
  if (i < 0) return null;
  return { before: text.slice(0, i), match: text.slice(i, i + nq.length), after: text.slice(i + nq.length) };
}

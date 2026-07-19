import { useEffect, useState } from 'react';

/**
 * DATA LAYER — FILMOGRAPHIE RAISONNÉE
 * All content is parsed from Mathilde Rouxel's 2020 PhD thesis into static JSON
 * served from /data/*.json (files are copied into public/data before the final
 * build). Every fetcher fails gracefully: a missing file yields empty data, so
 * pages must render loading / "non renseigné" states rather than break.
 */

/* ---------------------------------- Types --------------------------------- */

export interface Film {
  titleFr: string | null;
  titleTranslit: string | null;
  titleEn: string | null;
  titleDin: string | null;
  year: number | null;
  genre: string | null;
  countries: string[];
  format: string | null;
  length: string | null;
  color: string | null;
  language: string | null;
  credits: string | null;
  cast: string | null;
  synopsis: string | null;
  archive: string | null;
  festival: string | null;
  raw?: string;
}

export type Country = 'egypt' | 'lebanon' | 'tunisia';

export interface Filmmaker {
  slug: string;
  name: string;
  sortName: string;
  variants: string[];
  country: Country;
  bio: string;
  hasProfile: boolean;
  films: Film[];
}

export interface Profile {
  slug: string;
  name: string;
  birthYear: number | null;
  deathYear: number | null;
  country: string;
  bio: string[];
  filmographyLine: string;
  interviewNote: string;
  sections: { heading: string; quotes: string[] }[];
}

export interface TimelineData {
  periods: { label: string; range: string }[];
  events: { date: string; label: string; period: string }[];
}

export interface Meta {
  thesis: {
    author: string;
    title: string;
    university: string;
    year: number;
    halId: string;
    nnt: string;
    halUrl: string;
    defended: string;
    director: string;
  };
  counts: { filmmakers: number; profiles: number; films: number };
}

/** The bibliography JSON shape is owned by the data pipeline; keep it loose. */
export interface BibliographyEntry {
  author?: string | null;
  title?: string | null;
  year?: string | number | null;
  details?: string | null;
  text?: string | null;
}
export interface Bibliography {
  sections?: { heading: string; entries: (string | BibliographyEntry)[] }[];
  [key: string]: unknown;
}

/* --------------------------------- Fetching -------------------------------- */

const cache = new Map<string, Promise<unknown>>();

function fetchJson<T>(path: string, fallback: T): Promise<T> {
  let p = cache.get(path) as Promise<T> | undefined;
  if (!p) {
    p = fetch(path)
      .then((r) => {
        if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
        return r.json() as Promise<T>;
      })
      .catch(() => fallback);
    cache.set(path, p);
  }
  return p;
}

export const getFilmmakers = (): Promise<Filmmaker[]> => fetchJson<Filmmaker[]>('/data/filmmakers.json', []);
export const getProfiles = (): Promise<Profile[]> => fetchJson<Profile[]>('/data/profiles.json', []);
export const getTimeline = (): Promise<TimelineData> =>
  fetchJson<TimelineData>('/data/timeline.json', { periods: [], events: [] });
export const getBibliography = (): Promise<Bibliography> => fetchJson<Bibliography>('/data/bibliography.json', {});
export const getMeta = (): Promise<Meta | null> => fetchJson<Meta | null>('/data/meta.json', null);

/* ---------------------------------- Hooks ---------------------------------- */

interface AsyncState<T> {
  data: T;
  loading: boolean;
}

function useData<T>(fetcher: () => Promise<T>, initial: T): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: initial, loading: true });
  useEffect(() => {
    let alive = true;
    fetcher().then((data) => {
      if (alive) setState({ data, loading: false });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return state;
}

export const useFilmmakers = () => useData(getFilmmakers, [] as Filmmaker[]);
export const useProfiles = () => useData(getProfiles, [] as Profile[]);
export const useTimeline = () => useData(getTimeline, { periods: [], events: [] } as TimelineData);
export const useBibliography = () => useData(getBibliography, {} as Bibliography);
export const useMeta = () => useData<Meta | null>(getMeta, null);

/* ------------------------------ Domain helpers ----------------------------- */

export const COUNTRIES: { id: Country; label: string; labelFr: string; range: string }[] = [
  { id: 'egypt', label: 'EGYPT', labelFr: 'ÉGYPTE', range: '001–063' },
  { id: 'lebanon', label: 'LEBANON', labelFr: 'LIBAN', range: '064–143' },
  { id: 'tunisia', label: 'TUNISIA', labelFr: 'TUNISIE', range: '144–206' },
];

export const countryLabel = (c: string): string =>
  COUNTRIES.find((x) => x.id === c)?.label ?? c.toUpperCase();

/** Entries are numbered in thesis order (Égypte 001–063, Liban 064–143, Tunisie 144–206). */
export const entryNumber = (index: number): string => `Nº ${String(index + 1).padStart(3, '0')}`;

/** Initials for the typographic portrait plates (never fabricated portraits). */
export const initials = (name: string): string =>
  name
    .replace(/[«»"()]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 1 || /^[A-ZÀ-Þ]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

export const lifespan = (birth: number | null, death: number | null): string =>
  `${birth ?? '—'} ; ${death ?? '–'}`;

/** Non-breaking "non renseigné" dash for missing data. */
export const NR = '—';

/** Normalize for accent-insensitive search (handles transliteration variants). */
export const normalizeQuery = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`]/g, "'")
    .trim();

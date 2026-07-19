import ViewfinderCorners from '@/components/ViewfinderCorners';
import { initials, lifespan } from '@/lib/data';
import { cn } from '@/lib/utils';

/**
 * Typographic portrait plate (design.md §6.6) — replaces photographs, which
 * we never fabricate. Initials in Oswald 700 + red baseline rule + lifespan.
 */
export default function PortraitPlate({
  name,
  birthYear,
  deathYear,
  onInk = false,
  className,
}: {
  name: string;
  birthYear: number | null;
  deathYear: number | null;
  /** True on full-bleed ink bands ("screening room" inserts). */
  onInk?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'group/plate relative aspect-[4/5] w-full border p-4 transition-transform duration-150 hover:-translate-y-0.5',
        onInk ? 'border-[#FAFAF7]/30 bg-[#161613] text-[#FAFAF7]' : 'border-ink bg-paper-2 text-ink',
        className,
      )}
    >
      <ViewfinderCorners className={onInk ? 'text-[#FAFAF7]/40' : 'text-mute'} />
      <div className="flex h-full flex-col items-center justify-center">
        <span
          className="font-display font-bold uppercase leading-none transition-colors duration-200 group-hover/plate:text-red"
          style={{ fontSize: 'clamp(2.25rem, 6vw, 4.5rem)' }}
        >
          {initials(name)}
        </span>
        <span className="mt-2 block h-0.5 w-10 bg-red" aria-hidden="true" />
        <span className={cn('t-mono mt-3 text-[0.6875rem]', onInk ? 'text-[#FAFAF7]/60' : 'text-mute')}>
          {lifespan(birthYear, deathYear)}
        </span>
      </div>
    </div>
  );
}

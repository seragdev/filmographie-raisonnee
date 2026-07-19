import type { ReactNode } from 'react';
import Grain from '@/components/Grain';

/** Temporary on-brand placeholder for routes owned by page agents. */
export default function PageStub({
  kicker,
  title,
  note,
  children,
}: {
  kicker: string;
  title: string;
  note: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative">
      <Grain />
      <div className="container-site pb-32 pt-24">
        <p className="t-kicker text-red">{kicker}</p>
        <h1 className="t-display-1 mt-4">{title}</h1>
        <p className="t-mono mt-6 max-w-[70ch] text-[0.75rem] text-mute">{note}</p>
        {children}
      </div>
    </section>
  );
}

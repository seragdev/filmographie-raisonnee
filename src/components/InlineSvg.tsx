import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Fetches an SVG asset and inlines it so currentColor / stroke animations
 * work. Falls back to a plain <img> if the fetch fails.
 */
export default function InlineSvg({
  src,
  className,
  style,
}: {
  src: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [markup, setMarkup] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`${src}: HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (alive) setMarkup(text);
      })
      .catch(() => {
        /* <img> fallback remains */
      });
    return () => {
      alive = false;
    };
  }, [src]);

  if (!markup) {
    return <img src={src} className={cn('inline-block', className)} style={style} alt="" aria-hidden="true" />;
  }
  return (
    <span
      className={cn('inline-block [&>svg]:h-auto [&>svg]:w-full', className)}
      style={style}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

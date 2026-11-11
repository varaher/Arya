import { useId, useState, type ReactNode } from "react";

/**
 * ARYA home hero symbol: one purple drop, three rings that fade,
 * then a long still surface. Each calm brings a new short line.
 * Purely visual — no data, no side effects. Styles: design-system/still-water.css
 */

export const STILL_LINES = [
  "Still water shows the sky.",
  "Let it settle. Clarity comes on its own.",
  "You don’t have to solve it tonight.",
  "Between two feelings, there is a quiet place.",
  "Ripples pass. The water stays.",
  "Say it out loud. Then let it be.",
  "The mud settles when you stop stirring.",
  "One thought at a time is enough.",
  "Calm is not empty. It has room for you.",
  "You are allowed to just be here.",
];

export function StillWaterArt({ onCycle }: { onCycle?: () => void }) {
  const uid = useId().replace(/:/g, "");
  const pool = `sw-pool-${uid}`;
  const drop = `sw-drop-${uid}`;
  return (
    <div className="arya-still-water" aria-hidden="true">
      <svg viewBox="0 0 180 190">
        <defs>
          <radialGradient id={pool} cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#bfe0cf" stopOpacity=".55" />
            <stop offset="1" stopColor="#bfe0cf" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={drop} cx="35%" cy="30%">
            <stop offset="0" stopColor="#f6effc" />
            <stop offset=".55" stopColor="#b596d6" />
            <stop offset="1" stopColor="#78549b" />
          </radialGradient>
        </defs>
        <ellipse cx="90" cy="128" rx="88" ry="30" fill={`url(#${pool})`} />
        <ellipse className="sw-ripple" cx="90" cy="128" rx="80" ry="24" fill="none" stroke="#78549b" strokeWidth="1.6" />
        <ellipse className="sw-ripple sw-r2" cx="90" cy="128" rx="80" ry="24" fill="none" stroke="#5d9278" strokeWidth="1.4" />
        <ellipse className="sw-ripple sw-r3" cx="90" cy="128" rx="80" ry="24" fill="none" stroke="#9b7cc0" strokeWidth="1.2" />
        <ellipse cx="90" cy="128" rx="5" ry="1.8" fill="#78549b" opacity=".45" />
        <g className="sw-calm">
          <ellipse cx="90" cy="126" rx="46" ry="2" fill="var(--arya-still-shine)" opacity=".55" />
          <ellipse cx="90" cy="126" rx="20" ry="1" fill="var(--arya-still-shine)" />
        </g>
        <g className="sw-drop" onAnimationIteration={onCycle}>
          <path d="M90 104 C 95 112 97 116 97 119 A7 7 0 0 1 83 119 C 83 116 85 112 90 104 Z" fill={`url(#${drop})`} />
        </g>
      </svg>
    </div>
  );
}

/** Hook: the current still line, advancing once per water cycle. */
export function useStillLine(lines: string[] = STILL_LINES) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * lines.length));
  return {
    line: lines[index % lines.length],
    next: () => setIndex((i) => (i + 1) % lines.length),
  };
}

interface StillWaterHeroProps {
  overline: string;
  title: ReactNode;
  copy: string;
  ctaLabel: string;
  ctaIcon?: ReactNode;
  onCta: () => void;
  ctaTestId?: string;
  lines?: string[];
}

/** The home hero card: copy + CTA on the left, still water on the right, a rotating calm line. */
export function StillWaterHero({ overline, title, copy, ctaLabel, ctaIcon, onCta, ctaTestId, lines }: StillWaterHeroProps) {
  const { line, next } = useStillLine(lines);
  return (
    <article className="arya-hero-card" data-testid="card-home-hero">
      <div className="arya-hero-card__overline">
        <span className="arya-hero-card__star" aria-hidden="true">✦</span>
        {overline}
      </div>
      <StillWaterArt onCycle={next} />
      <h2 className="arya-hero-card__title">{title}</h2>
      <p className="arya-hero-card__copy">{copy}</p>
      <button type="button" className="arya-hero-card__cta" onClick={onCta} data-testid={ctaTestId}>
        {ctaLabel}
        {ctaIcon}
      </button>
      <p className="arya-still-line" data-testid="text-still-line">{line}</p>
    </article>
  );
}

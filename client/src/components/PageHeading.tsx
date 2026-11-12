import type { ReactNode } from "react";

/** Shared visual heading for ARYA screens. */
interface PageHeadingProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  accent?: ReactNode;
  sub?: ReactNode;
  tone?: "primary" | "secondary" | "night";
  className?: string;
}

export function PageHeading({
  eyebrow,
  title,
  accent,
  sub,
  tone = "primary",
  className = "",
}: PageHeadingProps) {
  return (
    <div className={`arya-page-heading arya-page-heading--${tone} ${className}`.trim()}>
      {eyebrow && <p className="arya-page-heading__eyebrow">{eyebrow}</p>}
      <h1 className="arya-page-heading__title">
        {title}
        {accent && (
          <>
            <br />
            <span className="arya-page-heading__accent">{accent}</span>
          </>
        )}
      </h1>
      {sub && <p className="arya-page-heading__sub">{sub}</p>}
    </div>
  );
}

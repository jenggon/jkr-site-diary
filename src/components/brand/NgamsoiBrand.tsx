import React from 'react';

interface NgamsoiMarkProps {
  className?: string;
  accentedBaseline?: boolean;
}

export function NgamsoiMark({ className = '', accentedBaseline = true }: NgamsoiMarkProps) {
  const datumClass = accentedBaseline
    ? 'ngamsoi-mark-datum ngamsoi-mark-baseline'
    : 'ngamsoi-mark-baseline';

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      focusable="false"
    >
      {/* Canonical NGAMSOI mark: reference marker above a locked datum notch.
          No vertical stroke crosses the datum, avoiding cross-like silhouettes at any scale. */}
      <path
        d="M21 13H43L32 28Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        vectorEffect="non-scaling-stroke"
      />
      <path
        className={datumClass}
        d="M11 43H27L32 38L37 43H53"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

interface NgamsoiBrandProps {
  compact?: boolean;
  className?: string;
}

export default function NgamsoiBrand({ compact = false, className = '' }: NgamsoiBrandProps) {
  return (
    <div
      className={`ngamsoi-brand-lockup ${compact ? 'ngamsoi-brand-lockup--compact' : ''} ${className}`.trim()}
      aria-label="NGAMSOI — Kena boh! Ngamsoi."
    >
      <span className="ngamsoi-mark-housing" aria-hidden="true">
        <NgamsoiMark className="ngamsoi-mark-svg" />
      </span>
      <span className="ngamsoi-brand-copy">
        <span className="ngamsoi-wordmark">NGAMSOI</span>
        <span className="ngamsoi-tagline" aria-hidden="true">
          <span className="ngamsoi-tagline-trigger">Kena boh!</span>{' '}
          <span>Ngamsoi.</span>
        </span>
      </span>
    </div>
  );
}

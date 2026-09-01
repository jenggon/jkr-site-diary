import React from 'react';

interface NgamsoiMarkProps {
  className?: string;
  accentedBaseline?: boolean;
}

export function NgamsoiMark({ className = '', accentedBaseline = true }: NgamsoiMarkProps) {
  const datumClass = accentedBaseline ? 'ngamsoi-mark-datum' : undefined;

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 128 92"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      focusable="false"
    >
      {/* Canonical NGAMSOI master: one closed inverted marker, one centred stem, one datum. */}
      <path
        d="M32 14H96L64 52Z"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        vectorEffect="non-scaling-stroke"
      />
      <path
        className={datumClass ? `${datumClass} ngamsoi-mark-stem` : 'ngamsoi-mark-stem'}
        d="M64 52V87"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="butt"
        vectorEffect="non-scaling-stroke"
      />
      <path
        className={datumClass ? `${datumClass} ngamsoi-mark-baseline` : 'ngamsoi-mark-baseline'}
        d="M10 72H118"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="butt"
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

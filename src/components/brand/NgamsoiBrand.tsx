import React from 'react';

interface NgamsoiMarkProps {
  className?: string;
  accentedBaseline?: boolean;
}

export function NgamsoiMark({ className = '', accentedBaseline = true }: NgamsoiMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 96 76"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      focusable="false"
    >
      <path
        d="M18 10H78L48 45L18 10Z"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinejoin="miter"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M48 50V71"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="square"
        vectorEffect="non-scaling-stroke"
      />
      <path
        className={accentedBaseline ? 'ngamsoi-mark-baseline' : undefined}
        d="M17 63H79"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="square"
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

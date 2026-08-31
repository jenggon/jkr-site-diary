'use client';

import React, { useEffect, useRef } from 'react';
import { NgamsoiMark } from './NgamsoiBrand';

interface NgamsoiCompletionRitualProps {
  savedSiteDiaryId?: string | null;
  isEditMode?: boolean;
  successText: string;
}

export default function NgamsoiCompletionRitual({
  savedSiteDiaryId,
  isEditMode = false,
  successText,
}: NgamsoiCompletionRitualProps) {
  const hapticKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!savedSiteDiaryId || hapticKeyRef.current === savedSiteDiaryId) return;
    hapticKeyRef.current = savedSiteDiaryId;

    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const navigatorWithVibration = navigator as Navigator & {
      vibrate?: (pattern: number | number[]) => boolean;
    };

    navigatorWithVibration.vibrate?.([16, 24, 28]);
  }, [savedSiteDiaryId]);

  const shortId = savedSiteDiaryId?.slice(0, 8);

  return (
    <div
      className="ng-completion"
      role="status"
      aria-live="polite"
      data-testid="ngamsoi-completion"
      data-completion-mode={isEditMode ? 'edit' : 'create'}
    >
      <span className="sr-only">{isEditMode ? 'Kemaskini Berjaya' : 'Simpanan Berjaya'}</span>
      <span className="sr-only">{successText}</span>

      <div className="ng-completion__instrument" aria-hidden="true">
        <span className="ng-completion__particle ng-completion__particle--1" />
        <span className="ng-completion__particle ng-completion__particle--2" />
        <span className="ng-completion__particle ng-completion__particle--3" />
        <span className="ng-completion__particle ng-completion__particle--4" />
        <span className="ng-completion__particle ng-completion__particle--5" />
        <span className="ng-completion__particle ng-completion__particle--6" />

        <span className="ng-completion__mark-shell">
          <NgamsoiMark className="ng-completion__mark" />
          <span className="ng-completion__check">✓</span>
        </span>

        <span className="ng-completion__baseline" />
      </div>

      <p className="ng-completion__signature" aria-hidden="true">
        <span>Kena boh!</span>
        <span>Ngamsoi.</span>
      </p>

      {shortId && (
        <span className="ng-completion__id" aria-hidden="true">
          #{shortId}
        </span>
      )}
    </div>
  );
}

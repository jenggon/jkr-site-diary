'use client';

import React, { useEffect, useRef } from 'react';
import { NgamsoiMark } from './NgamsoiBrand';

interface NgamsoiCompletionRitualProps {
  savedSiteDiaryId?: string | null | undefined;
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
    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const navigatorWithVibration = navigator as Navigator & {
      vibrate?: (pattern: number | number[]) => boolean;
    };

    navigatorWithVibration.vibrate?.([16, 24, 28]);
  }, [savedSiteDiaryId]);

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
        <span className="ng-completion__mark-shell">
          <NgamsoiMark className="ng-completion__mark" />
        </span>
      </div>
    </div>
  );
}

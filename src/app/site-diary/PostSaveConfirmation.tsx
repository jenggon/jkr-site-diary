'use client';

import React from 'react';

interface PostSaveConfirmationProps {
  readonly savedSiteDiaryId: string;
  readonly successText: string;
  readonly onShowRecords: () => void;
  readonly onAddActivity: () => void;
}

export default function PostSaveConfirmation({
  savedSiteDiaryId,
  successText,
  onShowRecords,
  onAddActivity,
}: PostSaveConfirmationProps) {
  return (
    <aside
      className="ng-post-save"
      role="status"
      aria-live="polite"
      data-testid="post-save-confirmation"
      data-saved-site-diary-id={savedSiteDiaryId}
    >
      <div className="ng-post-save__body">
        <div className="ng-post-save__status">
          <span className="ng-post-save__check" aria-hidden="true">✓</span>
          <div className="ng-post-save__copy">
            <strong className="ng-post-save__title">Disimpan</strong>
            <span className="ng-post-save__brand">Kena boh! Ngamsoi.</span>
            <span className="sr-only">{successText}</span>
          </div>
        </div>
      </div>
      <div className="ng-post-save__actions" aria-label="Tindakan selepas simpan">
        <button
          type="button"
          className="ng-post-save__action--primary"
          onClick={onShowRecords}
          data-testid="post-save-show-records"
        >
          Tunjuk Rekod
        </button>
        <button
          type="button"
          className="ng-post-save__action--secondary"
          onClick={onAddActivity}
          data-testid="post-save-add-activity"
        >
          Tambah Aktiviti
        </button>
      </div>
    </aside>
  );
}

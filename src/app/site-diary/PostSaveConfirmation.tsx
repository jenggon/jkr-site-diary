'use client';

import React from 'react';
import NgamsoiCompletionRitual from '@/components/brand/NgamsoiCompletionRitual';

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
        <NgamsoiCompletionRitual
          savedSiteDiaryId={savedSiteDiaryId}
          isEditMode={false}
          successText={successText}
        />
      </div>
      <div className="ng-post-save__actions" aria-label="Tindakan selepas simpan">
        <button type="button" onClick={onShowRecords} data-testid="post-save-show-records">
          Tunjuk Rekod
        </button>
        <button type="button" onClick={onAddActivity} data-testid="post-save-add-activity">
          Tambah Aktiviti
        </button>
      </div>
    </aside>
  );
}

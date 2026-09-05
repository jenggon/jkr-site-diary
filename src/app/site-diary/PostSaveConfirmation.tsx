'use client';

import React, { Fragment, useEffect, useRef, useState } from 'react';

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
  const dialogRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLElement | null>(null);
  const receiptRef = useRef<HTMLElement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) receiptRef.current?.focus({ preventScroll: true });
    else titleRef.current?.focus({ preventScroll: true });
  }, [dismissed]);

  const dismiss = () => setDismissed(true);

  const trapFocus = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      dismiss();
      return;
    }
    if (event.key !== 'Tab') return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.offsetParent !== null);

    if (focusable.length === 0) {
      event.preventDefault();
      titleRef.current?.focus({ preventScroll: true });
      return;
    }

    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;

    const active = document.activeElement;
    if (!focusable.includes(active as HTMLElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus({ preventScroll: true });
      return;
    }

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  };

  if (dismissed) {
    return (
      <div
        className="ng-entry-step ng-entry-step--save ng-entry-step--saved"
        data-entry-step="save"
        data-spine-state="complete"
        data-save-complete="true"
      >
        <section
          ref={receiptRef}
          className="ng-saved-receipt"
          data-testid="post-save-receipt"
          data-saved-site-diary-id={savedSiteDiaryId}
          aria-labelledby="ng-saved-receipt-title"
          tabIndex={-1}
        >
          <div className="ng-saved-receipt__status">
            <span className="ng-saved-receipt__node" aria-hidden="true">✓</span>
            <div className="ng-saved-receipt__copy">
              <span className="ng-saved-receipt__eyebrow">Catatan selesai</span>
              <strong id="ng-saved-receipt-title">Disimpan</strong>
              <span className="sr-only">{successText}</span>
            </div>
          </div>
          <div className="ng-saved-receipt__actions" aria-label="Tindakan selepas simpan">
            <button type="button" onClick={onShowRecords} data-testid="post-save-receipt-show-records">
              Tunjuk Rekod
            </button>
            <button type="button" onClick={onAddActivity} data-testid="post-save-receipt-add-activity">
              Tambah Aktiviti
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <Fragment>
      <div
        className="ng-entry-step ng-entry-step--save ng-entry-step--saved"
        data-entry-step="save"
        data-spine-state="complete"
        data-save-complete="true"
      >
        <div className="ng-save-complete-marker" aria-hidden="true">Disimpan</div>
      </div>

      <div
        className="ng-vo-dialog-backdrop ng-post-save-backdrop"
        data-testid="post-save-backdrop"
        onMouseDown={(event) => {
          if (event.currentTarget === event.target) event.preventDefault();
        }}
      >
        <aside
          ref={dialogRef}
          className="ng-vo-dialog ng-post-save ng-completion-seal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ng-post-save-title"
          aria-describedby="ng-post-save-brand"
          data-testid="post-save-confirmation"
          data-saved-site-diary-id={savedSiteDiaryId}
          onKeyDown={trapFocus}
        >
          <button
            type="button"
            className="ng-dialog-close ng-completion-seal__close"
            aria-label="Tutup pengesahan simpan"
            data-testid="post-save-close"
            onClick={dismiss}
          >
            ×
          </button>

          <div className="ng-completion-seal__hero">
            <span className="ng-completion-seal__node" aria-hidden="true">✓</span>
            <div className="ng-post-save__copy">
              <span className="ng-vo-dialog__eyebrow">Catatan selesai</span>
              <strong
                ref={titleRef}
                id="ng-post-save-title"
                className="ng-post-save__title"
                tabIndex={-1}
              >
                Disimpan
              </strong>
              <span id="ng-post-save-brand" className="ng-post-save__brand">Kena boh! Ngamsoi.</span>
              <span className="sr-only">{successText}</span>
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
      </div>
    </Fragment>
  );
}

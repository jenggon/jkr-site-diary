'use client';

import React, { useCallback, useEffect, useState } from 'react';
import CatatEntryForm from './CatatEntryForm';
import DailyEntryForm from './DailyEntryForm';
import DiaryManagementList from './DiaryManagementList';
import ApprovalQueue from './ApprovalQueue';
import ApprovalReview from './ApprovalReview';
import { useDailyEntryContext } from './DailyEntryShell';

type WorkspaceTab = 'NEW' | 'OPEN' | 'RECORDS' | 'APPROVALS';

function Icon({ type }: { type: WorkspaceTab }) {
  if (type === 'NEW') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5"><path strokeWidth="2" strokeLinecap="round" d="M12 5v14M5 12h14" /></svg>;
  if (type === 'OPEN') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 7h6l2 2h8v10H4z" /></svg>;
  if (type === 'RECORDS') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 5h14v14H5zM8 9h8M8 13h8M8 17h5" /></svg>;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M7 12l3 3 7-7M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z" /></svg>;
}

export default function SiteDiaryWorkspace() {
  const { programmeId } = useDailyEntryContext();
  const [tab, setTab] = useState<WorkspaceTab>('RECORDS');
  const [reviewContext, setReviewContext] = useState<{ programmeId: string; siteDiaryId: string; approvalId: string } | null>(null);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [compactOverlayOpen, setCompactOverlayOpen] = useState(false);

  useEffect(() => {
    try { setDesktopCollapsed(window.localStorage.getItem('site-diary-nav-collapsed') === '1'); } catch { /* no-op */ }
  }, []);

  useEffect(() => { setReviewContext(null); }, [programmeId]);

  const tabs: Array<{ id: WorkspaceTab; label: string; meaning: string }> = [
    { id: 'NEW', label: 'Catat', meaning: 'Catat kerja' },
    { id: 'OPEN', label: 'Aktiviti', meaning: 'Aktiviti terbuka' },
    { id: 'RECORDS', label: 'Rekod', meaning: 'Rekod kerja' },
    { id: 'APPROVALS', label: 'Semak', meaning: 'Semakan' },
  ];

  const navigateToTab = useCallback((nextTab: WorkspaceTab) => {
    setReviewContext(null);
    setTab(nextTab);
    setCompactOverlayOpen(false);
  }, []);

  const isReviewingApproval = reviewContext?.programmeId === programmeId;
  const effectiveTab: WorkspaceTab = isReviewingApproval ? 'APPROVALS' : tab;

  const renderContent = () => {
    if (isReviewingApproval && reviewContext) {
      return (
        <div className="ng-workspace-review w-full" data-workspace-detail="approval-review">
          <ApprovalReview
            siteDiaryId={reviewContext.siteDiaryId}
            approvalId={reviewContext.approvalId}
            onBack={() => setReviewContext(null)}
            onSuccess={() => setReviewContext(null)}
          />
        </div>
      );
    }

    if (tab === 'NEW') return <CatatEntryForm />;
    if (tab === 'OPEN') return <DailyEntryForm key="open" initialTab="OPEN_ACTIVITIES" hideModeNavigation />;
    if (tab === 'RECORDS') return <DiaryManagementList />;
    return (
      <ApprovalQueue
        onSelectReview={(siteDiaryId, approvalId) => {
          if (programmeId) setReviewContext({ programmeId, siteDiaryId, approvalId });
        }}
      />
    );
  };

  const toggleDesktopCollapsed = () => {
    setDesktopCollapsed((current) => {
      const next = !current;
      try { window.localStorage.setItem('site-diary-nav-collapsed', next ? '1' : '0'); } catch { /* no-op */ }
      return next;
    });
  };

  return (
    <div
      className="ng-workspace relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden md:flex-row"
      data-workspace-tab={effectiveTab}
      data-workspace-review={isReviewingApproval ? 'true' : 'false'}
    >
      <nav
        aria-label="Navigasi Buku Harian Tapak"
        className={`ng-adaptive-nav hidden shrink-0 flex-col border-r border-surface-border bg-surface-canvas md:flex ${desktopCollapsed ? 'is-collapsed' : ''} ${compactOverlayOpen ? 'is-overlay-open' : ''}`}
      >
        <div role="tablist" aria-label="Ruang kerja Buku Harian Tapak" className="flex-1 space-y-1 p-2">
          {tabs.map((item) => {
            const selected = effectiveTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="site-diary-workspace-panel"
                onClick={() => navigateToTab(item.id)}
                title={item.meaning}
                className={`ng-adaptive-nav__item flex min-h-[48px] w-full items-center rounded-lg border-l-2 px-3 outline-none transition ${selected ? 'border-accent-selected bg-surface-raised text-accent-selected' : 'border-transparent text-tactical-text-muted hover:bg-surface-raised hover:text-tactical-text-primary'}`}
              >
                <span className="ng-adaptive-nav__icon flex w-7 shrink-0 justify-center"><Icon type={item.id} /></span>
                <span className="ng-adaptive-nav__label ml-3 text-sm font-semibold">{item.label}</span>
              </button>
            );
          })}
        </div>
        <div className="border-t border-surface-border p-2">
          <button
            type="button"
            onClick={() => {
              if (window.matchMedia('(max-width: 1199px)').matches) setCompactOverlayOpen((current) => !current);
              else toggleDesktopCollapsed();
            }}
            className="ng-adaptive-nav__toggle flex min-h-[44px] w-full items-center justify-center rounded-lg text-tactical-text-muted hover:bg-surface-raised hover:text-tactical-text-primary"
            aria-label="Kembang atau kecilkan navigasi"
            title="Kembang / kecil"
          >
            <span aria-hidden="true">{desktopCollapsed || !compactOverlayOpen ? '›' : '‹'}</span>
          </button>
        </div>
      </nav>

      {compactOverlayOpen && <button type="button" aria-label="Tutup navigasi" className="ng-adaptive-nav-backdrop hidden md:block" onClick={() => setCompactOverlayOpen(false)} />}

      <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-surface-canvas px-2 py-4 pb-24 sm:px-4 md:px-6 md:pb-6" data-workspace-scroll>
          <div
            id="site-diary-workspace-panel"
            role="tabpanel"
            aria-label={tabs.find((item) => item.id === effectiveTab)?.label}
            className="ng-workspace-content mx-auto w-full max-w-5xl"
            key={`${programmeId ?? 'no-programme'}-${effectiveTab}-${isReviewingApproval ? 'review' : 'root'}`}
          >
            {renderContent()}
          </div>
        </div>
      </div>

      <nav aria-label="Navigasi Buku Harian Tapak" className="mobile-entry-bottom-nav absolute bottom-0 left-0 right-0 z-40 border-t border-surface-border bg-surface-primary/95 pb-safe backdrop-blur-xl md:hidden">
        <div role="tablist" aria-label="Ruang kerja Buku Harian Tapak" className="flex items-center justify-around px-1 py-2">
          {tabs.map((item) => {
            const selected = effectiveTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="site-diary-workspace-panel"
                onClick={() => navigateToTab(item.id)}
                className={`mobile-entry-nav-item flex min-h-[56px] flex-1 flex-col items-center justify-center rounded-lg border-t-2 transition ${selected ? 'border-accent-selected bg-surface-raised text-accent-selected' : 'border-transparent text-tactical-text-muted'}`}
              >
                <span className="mb-1"><Icon type={item.id} /></span>
                <span className="text-xs font-bold tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <style jsx global>{`
        .ng-adaptive-nav { width: 224px; transition: width 160ms ease, box-shadow 160ms ease; z-index: 45; }
        .ng-adaptive-nav.is-collapsed { width: 72px; }
        .ng-adaptive-nav.is-collapsed .ng-adaptive-nav__label { display: none; }
        .ng-adaptive-nav-backdrop { position: absolute; inset: 0; z-index: 44; background: rgb(0 0 0 / .24); }
        @media (min-width: 768px) and (max-width: 1199px) {
          .ng-adaptive-nav { width: 72px; }
          .ng-adaptive-nav .ng-adaptive-nav__label { display: none; }
          .ng-adaptive-nav.is-overlay-open { position: absolute; inset-block: 0; left: 0; width: 224px; box-shadow: 18px 0 40px rgb(0 0 0 / .35); }
          .ng-adaptive-nav.is-overlay-open .ng-adaptive-nav__label { display: inline; }
        }
        @media (min-width: 1200px) {
          .ng-adaptive-nav-backdrop { display: none !important; }
        }
      `}</style>
    </div>
  );
}

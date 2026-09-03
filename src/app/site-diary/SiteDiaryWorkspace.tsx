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
  const [compactViewport, setCompactViewport] = useState(false);

  useEffect(() => {
    try { setDesktopCollapsed(window.localStorage.getItem('site-diary-nav-collapsed') === '1'); } catch { /* no-op */ }
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px) and (max-width: 1199px)');
    const sync = () => {
      setCompactViewport(media.matches);
      if (!media.matches) setCompactOverlayOpen(false);
    };
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
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
  const navigationExpanded = compactViewport ? compactOverlayOpen : !desktopCollapsed;

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

  const toggleNavigation = () => {
    if (compactViewport) {
      setCompactOverlayOpen((current) => !current);
      return;
    }
    toggleDesktopCollapsed();
  };

  return (
    <div
      className="ng-workspace relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden md:flex-row"
      data-workspace-tab={effectiveTab}
      data-workspace-review={isReviewingApproval ? 'true' : 'false'}
    >
      <nav
        id="site-diary-desktop-navigation"
        aria-label="Navigasi Buku Harian Tapak"
        className={`ng-workspace-nav ng-workspace-nav--desktop ng-adaptive-nav hidden shrink-0 flex-col md:flex ${desktopCollapsed ? 'is-collapsed' : ''} ${compactOverlayOpen ? 'is-overlay-open' : ''}`}
      >
        <div id="site-diary-desktop-navigation-items" role="tablist" aria-label="Ruang kerja Buku Harian Tapak" className="ng-workspace-nav__list flex-1">
          {tabs.map((item) => {
            const isSelected = effectiveTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                data-selected={isSelected ? 'true' : 'false'}
                aria-controls="site-diary-workspace-panel"
                onClick={() => navigateToTab(item.id)}
                title={item.meaning}
                className="ng-workspace-nav__item ng-adaptive-nav__item"
              >
                <span className="ng-workspace-nav__icon ng-adaptive-nav__icon"><Icon type={item.id} /></span>
                <span className="ng-workspace-nav__label ng-adaptive-nav__label">{item.label}</span>
              </button>
            );
          })}
        </div>
        <div className="ng-adaptive-nav__controls">
          <button
            type="button"
            onClick={toggleNavigation}
            className="ng-adaptive-nav__toggle"
            aria-expanded={navigationExpanded}
            aria-controls="site-diary-desktop-navigation-items"
            aria-label={navigationExpanded ? 'Kecilkan navigasi' : 'Kembangkan navigasi'}
            title={navigationExpanded ? 'Kecilkan navigasi' : 'Kembangkan navigasi'}
          >
            <span aria-hidden="true">{navigationExpanded ? '‹' : '›'}</span>
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

      <nav aria-label="Navigasi Buku Harian Tapak" className="ng-workspace-nav ng-workspace-nav--mobile mobile-entry-bottom-nav absolute bottom-0 left-0 right-0 z-40 md:hidden">
        <div role="tablist" aria-label="Ruang kerja Buku Harian Tapak" className="ng-workspace-nav__list">
          {tabs.map((item) => {
            const isSelected = effectiveTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                data-selected={isSelected ? 'true' : 'false'}
                aria-controls="site-diary-workspace-panel"
                onClick={() => navigateToTab(item.id)}
                className="ng-workspace-nav__item mobile-entry-nav-item"
              >
                <span className="ng-workspace-nav__icon"><Icon type={item.id} /></span>
                <span className="ng-workspace-nav__label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

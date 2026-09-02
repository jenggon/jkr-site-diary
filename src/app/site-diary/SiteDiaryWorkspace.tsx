'use client';

import React, { useCallback, useEffect, useState } from 'react';
import DailyEntryForm from './DailyEntryForm';
import DiaryManagementList from './DiaryManagementList';
import ApprovalQueue from './ApprovalQueue';
import ApprovalReview from './ApprovalReview';
import { useDailyEntryContext } from './DailyEntryShell';

type WorkspaceTab = 'NEW' | 'OPEN' | 'RECORDS' | 'APPROVALS';

export default function SiteDiaryWorkspace() {
  const { programmeId } = useDailyEntryContext();
  const [tab, setTab] = useState<WorkspaceTab>('RECORDS');
  const [reviewContext, setReviewContext] = useState<{
    programmeId: string;
    siteDiaryId: string;
    approvalId: string;
  } | null>(null);

  const tabs: Array<{ id: WorkspaceTab; label: string; icon: React.ReactNode }> = [
    {
      id: 'NEW',
      label: 'Baharu',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 sm:w-6 sm:h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      id: 'OPEN',
      label: 'Aktiviti',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 sm:w-6 sm:h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      id: 'RECORDS',
      label: 'Rekod',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 sm:w-6 sm:h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
    },
    {
      id: 'APPROVALS',
      label: 'Semak',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 sm:w-6 sm:h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ];

  useEffect(() => {
    setReviewContext(null);
  }, [programmeId]);

  const navigateToTab = useCallback((nextTab: WorkspaceTab) => {
    setReviewContext(null);
    setTab(nextTab);
  }, []);

  const isReviewingApproval = reviewContext?.programmeId === programmeId;
  const effectiveTab: WorkspaceTab = isReviewingApproval ? 'APPROVALS' : tab;

  const renderContent = () => {
    if (isReviewingApproval && reviewContext) {
      return (
        <div
          className="ng-workspace-review w-full"
          data-workspace-detail="approval-review"
        >
          <ApprovalReview
            siteDiaryId={reviewContext.siteDiaryId}
            approvalId={reviewContext.approvalId}
            onBack={() => setReviewContext(null)}
            onSuccess={() => setReviewContext(null)}
          />
        </div>
      );
    }

    return (
      <div
        key={programmeId ?? 'no-programme'}
        data-programme-context={programmeId ?? ''}
        className="w-full"
      >
        {tab === 'RECORDS' ? (
          <DiaryManagementList />
        ) : tab === 'APPROVALS' ? (
          <ApprovalQueue
            onSelectReview={(siteDiaryId, approvalId) => {
              if (programmeId) setReviewContext({ programmeId, siteDiaryId, approvalId });
            }}
          />
        ) : (
          <DailyEntryForm
            key={tab}
            initialTab={tab === 'OPEN' ? 'OPEN_ACTIVITIES' : 'NEW_ACTIVITY'}
            hideModeNavigation
          />
        )}
      </div>
    );
  };

  return (
    <div
      className="ng-workspace flex-1 flex flex-col md:flex-row w-full h-full min-h-0 overflow-hidden relative"
      data-workspace-tab={effectiveTab}
      data-workspace-review={isReviewingApproval ? 'true' : 'false'}
    >
      {/* Desktop Sidebar Rail */}
      <nav
        aria-label="Navigasi Buku Harian Tapak"
        className="ng-workspace-nav ng-workspace-nav--desktop hidden md:flex flex-col w-20 lg:w-64 shrink-0 bg-surface-canvas border-r border-surface-border overflow-y-auto"
      >
        <div
          role="tablist"
          aria-label="Ruang kerja Buku Harian Tapak"
          className="ng-workspace-nav__list flex-1 py-4 px-2 lg:px-3 space-y-1 lg:space-y-2"
        >
          {tabs.map((item) => {
            const isSelected = effectiveTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls="site-diary-workspace-panel"
                data-workspace-nav={item.id}
                data-selected={isSelected ? 'true' : 'false'}
                onClick={() => navigateToTab(item.id)}
                className={`ng-workspace-nav__item w-full flex items-center p-3 rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent-selected active:duration-75 ${
                  isSelected
                    ? 'bg-surface-raised text-accent-selected border-l-4 border-accent-selected shadow-sm active:bg-surface-interactive'
                    : 'text-tactical-text-secondary hover:bg-surface-raised hover:text-tactical-text-primary border-l-4 border-transparent active:bg-surface-interactive'
                }`}
                title={item.label}
              >
                <div
                  className={`ng-workspace-nav__icon shrink-0 flex items-center justify-center ${isSelected ? 'text-accent-selected' : 'text-tactical-text-muted'}`}
                >
                  {item.icon}
                </div>
                <span
                  className={`ng-workspace-nav__label ml-3 hidden lg:block text-sm font-semibold tracking-wide ${isSelected ? 'text-tactical-text-primary' : ''}`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col w-full h-full min-w-0 overflow-hidden relative">
        <div className="flex-1 overflow-y-auto bg-surface-canvas w-full px-2 sm:px-4 md:px-6 py-4 pb-24 md:pb-6">
          <div
            id="site-diary-workspace-panel"
            role="tabpanel"
            aria-label={tabs.find((item) => item.id === effectiveTab)?.label}
            className="ng-workspace-content w-full max-w-5xl mx-auto"
            key={`${programmeId ?? 'no-programme'}-${effectiveTab}-${isReviewingApproval ? 'review' : 'root'}`}
          >
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Navigasi Buku Harian Tapak"
        className="ng-workspace-nav ng-workspace-nav--mobile mobile-entry-bottom-nav md:hidden absolute bottom-0 left-0 right-0 z-40 bg-surface-primary/95 backdrop-blur-xl border-t border-surface-border shadow-[0_-4px_12px_rgba(0,0,0,0.3)] pb-safe"
      >
        <div
          role="tablist"
          aria-label="Ruang kerja Buku Harian Tapak"
          className="ng-workspace-nav__list flex items-center justify-around px-1 py-2"
        >
          {tabs.map((item) => {
            const isSelected = effectiveTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls="site-diary-workspace-panel"
                data-workspace-nav={item.id}
                data-selected={isSelected ? 'true' : 'false'}
                onClick={() => navigateToTab(item.id)}
                className={`ng-workspace-nav__item mobile-entry-nav-item flex flex-col items-center justify-center flex-1 min-h-[56px] rounded-lg transition-colors duration-150 motion-safe:active:scale-95 active:duration-75 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-selected ${
                  isSelected
                    ? 'bg-surface-raised text-accent-selected border-t-2 border-accent-selected'
                    : 'text-tactical-text-muted hover:bg-surface-primary hover:text-tactical-text-secondary border-t-2 border-transparent'
                }`}
              >
                <div
                  className={`ng-workspace-nav__icon mb-1 motion-safe:transition-transform motion-safe:duration-150 ${isSelected ? 'motion-safe:scale-110' : ''}`}
                >
                  {item.icon}
                </div>
                <span
                  className={`ng-workspace-nav__label text-xs font-bold tracking-tight ${isSelected ? 'text-tactical-text-primary' : ''}`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

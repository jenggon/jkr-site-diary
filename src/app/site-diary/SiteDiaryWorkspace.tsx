'use client';

import React, { useEffect, useState } from 'react';
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

  const tabs: Array<{ id: WorkspaceTab; label: string }> = [
    { id: 'NEW', label: 'Laporan Baharu' },
    { id: 'OPEN', label: 'Aktiviti Terbuka' },
    { id: 'RECORDS', label: 'Rekod / Sejarah' },
    { id: 'APPROVALS', label: 'Kelulusan' },
  ];

  useEffect(() => {
    setReviewContext(null);
  }, [programmeId]);

  if (reviewContext?.programmeId === programmeId) {
    return (
      <ApprovalReview
        siteDiaryId={reviewContext.siteDiaryId}
        approvalId={reviewContext.approvalId}
        onBack={() => setReviewContext(null)}
        onSuccess={() => setReviewContext(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <nav aria-label="Navigasi Buku Harian Tapak" className="grid grid-cols-2 gap-1 rounded-2xl border border-zinc-800 bg-zinc-900 p-1 sm:grid-cols-4">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            style={{ minHeight: 44 }}
            className={`min-h-[44px] rounded-xl px-2 py-2 text-xs font-bold transition-colors ${
              tab === item.id ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div key={programmeId ?? 'no-programme'} data-programme-context={programmeId ?? ''}>
        {tab === 'RECORDS' ? (
          <DiaryManagementList />
        ) : tab === 'APPROVALS' ? (
          <ApprovalQueue onSelectReview={(siteDiaryId, approvalId) => {
            if (programmeId) setReviewContext({ programmeId, siteDiaryId, approvalId });
          }} />
        ) : (
          <DailyEntryForm
            key={tab}
            initialTab={tab === 'OPEN' ? 'OPEN_ACTIVITIES' : 'NEW_ACTIVITY'}
            hideModeNavigation
          />
        )}
      </div>
    </div>
  );
}

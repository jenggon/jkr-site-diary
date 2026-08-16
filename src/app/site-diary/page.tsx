'use client';

import DailyEntryShell from './DailyEntryShell';
import F1GoldenPathBridge from './F1GoldenPathBridge';
import LegacySiteDiaryPage from './LegacySiteDiaryPage';

export default function SiteDiaryPage() {
  return (
    <DailyEntryShell>
      <F1GoldenPathBridge>
        <LegacySiteDiaryPage />
      </F1GoldenPathBridge>
    </DailyEntryShell>
  );
}

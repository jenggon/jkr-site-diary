import { Suspense } from 'react';
import PrintSiteDiaryClient from './PrintSiteDiaryClient';

export default function PrintSiteDiaryPage() {
  return (
    <Suspense fallback={<div style={{ padding: '20px' }}>Memuatkan...</div>}>
      <PrintSiteDiaryClient />
    </Suspense>
  );
}

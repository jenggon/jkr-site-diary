import { NextRequest, NextResponse } from 'next/server';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { createA26QueryService } from '@/composition/a26QueryComposition';

export async function GET(request: NextRequest) {
  const identity = await extractVerifiedIdentity(request);
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const activityDate =
    request.nextUrl.searchParams.get('date') ?? new Date().toISOString().split('T')[0] ?? '';
  try {
    return NextResponse.json(
      await createA26QueryService(identity.accessToken).getReports(activityDate),
    );
  } catch {
    return NextResponse.json({ error: 'Failed to load reports' }, { status: 500 });
  }
}

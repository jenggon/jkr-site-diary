import { NextResponse } from 'next/server';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { createSiteDiaryHistoryService } from '@/composition/siteDiaryManagementComposition';
import { SiteDiaryHistoryNotFoundError } from '@/services/SiteDiaryHistoryService';
import { isValidUuid } from '@/lib/uuid';

type RouteParams = { params: Promise<{ siteDiaryId: string }> };

export async function GET(request: Request, context: RouteParams) {
  try {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) return NextResponse.json({ error: 'Unauthorized: Missing or invalid identity' }, { status: 401 });
    const { siteDiaryId } = await context.params;
    if (!isValidUuid(siteDiaryId)) return NextResponse.json({ error: 'Missing or invalid route parameter: siteDiaryId' }, { status: 400 });
    const data = await createSiteDiaryHistoryService(identity.accessToken).getHistory(siteDiaryId);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error: unknown) {
    const status = error instanceof SiteDiaryHistoryNotFoundError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to retrieve Site Diary history' }, { status });
  }
}

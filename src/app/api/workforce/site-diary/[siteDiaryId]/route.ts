import { NextResponse } from 'next/server';
import { workforceService } from '@/services/workforceService';

type RouteParams = {
  params: Promise<{ siteDiaryId: string }>;
};

/**
 * GET /api/workforce/site-diary/[siteDiaryId]
 * Retrieves all Workforce records belonging to a Site Diary entry.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { siteDiaryId } = await context.params;

    if (!siteDiaryId || typeof siteDiaryId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: siteDiaryId' },
        { status: 400 }
      );
    }

    const workforceRecords = await workforceService.getWorkforceBySiteDiary(siteDiaryId);

    return NextResponse.json({ data: workforceRecords }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve workforce records by site diary' },
      { status: 500 }
    );
  }
}

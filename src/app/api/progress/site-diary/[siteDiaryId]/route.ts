import { NextResponse } from 'next/server';
import { progressService } from '@/services/progressService';

type RouteParams = {
  params: Promise<{ siteDiaryId: string }>;
};

/**
 * GET /api/progress/site-diary/[siteDiaryId]
 * Retrieves all Progress records belonging to a Site Diary entry.
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

    const progressRecords = await progressService.getProgressBySiteDiary(siteDiaryId);

    return NextResponse.json({ data: progressRecords }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve progress records by site diary' },
      { status: 500 }
    );
  }
}

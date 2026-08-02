import { NextResponse } from 'next/server';
import { siteDiaryService } from '@/services/siteDiaryService';

type RouteParams = {
  params: Promise<{ activityId: string }>;
};

/**
 * GET /api/site-diary/activity/[activityId]
 * Retrieves Site Diary records belonging to an Activity.
 * Supports optional `date` query parameter for specific date lookup.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { activityId } = await context.params;

    if (!activityId || typeof activityId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: activityId' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (date) {
      const siteDiary = await siteDiaryService.getSiteDiaryByActivityAndDate(activityId, date);

      if (!siteDiary) {
        return NextResponse.json(
          { error: 'Site diary record for specified date not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: siteDiary }, { status: 200 });
    }

    const siteDiaries = await siteDiaryService.getSiteDiariesByActivity(activityId);

    return NextResponse.json({ data: siteDiaries }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve site diaries by activity' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { createSiteDiaryService } from '@/composition/siteDiaryComposition';
import { extractIdentity } from '@/app/api/_shared/identity';
import { isSuccess } from '@/lib/result';

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
    const actorId = await extractIdentity(request);
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid identity' }, { status: 401 });
    }

    const { activityId } = await context.params;

    if (!activityId || typeof activityId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: activityId' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    const siteDiaryService = createSiteDiaryService();
    const result = await siteDiaryService.getSiteDiariesByActivity(activityId);

    if (isSuccess(result)) {
      let diaries = result.value;

      if (date) {
        const found = diaries.find(d => d.activity_date === date);
        if (!found) {
          return NextResponse.json(
            { error: 'Site diary record for specified date not found' },
            { status: 404 }
          );
        }
        return NextResponse.json({ data: found }, { status: 200 });
      }

      return NextResponse.json({ data: diaries }, { status: 200 });
    }

    return NextResponse.json({ error: result.error.message }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve site diaries by activity' },
      { status: 500 }
    );
  }
}

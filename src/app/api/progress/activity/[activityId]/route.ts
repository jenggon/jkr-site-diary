import { NextResponse } from 'next/server';
import { progressService } from '@/services/progressService';

type RouteParams = {
  params: Promise<{ activityId: string }>;
};

/**
 * GET /api/progress/activity/[activityId]
 * Retrieves all Progress records belonging to an Activity.
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

    const progressRecords = await progressService.getProgressByActivity(activityId);

    return NextResponse.json({ data: progressRecords }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve progress records by activity' },
      { status: 500 }
    );
  }
}

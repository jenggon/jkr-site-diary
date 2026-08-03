import { NextResponse } from 'next/server';
import { workforceService } from '@/services/workforceService';

type RouteParams = {
  params: Promise<{ activityId: string }>;
};

/**
 * GET /api/workforce/activity/[activityId]
 * Retrieves all Workforce records belonging to an Activity.
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

    const workforceRecords = await workforceService.getWorkforceByActivity(activityId);

    return NextResponse.json({ data: workforceRecords }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve workforce records by activity' },
      { status: 500 }
    );
  }
}

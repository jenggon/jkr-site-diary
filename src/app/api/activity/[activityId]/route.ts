import { NextResponse } from 'next/server';
import { activityService } from '@/services/activityService';

type RouteParams = {
  params: Promise<{ activityId: string }>;
};

/**
 * GET /api/activity/[activityId]
 * Retrieves an Activity by ID.
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

    const activity = await activityService.getActivityById(activityId);

    if (!activity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: activity }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve activity' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/activity/[activityId]
 * Updates an existing Activity.
 */
export async function PATCH(request: Request, context: RouteParams) {
  try {
    const { activityId } = await context.params;

    if (!activityId || typeof activityId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: activityId' },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid payload: Request body must be a valid JSON object' },
        { status: 400 }
      );
    }

    const updatedActivity = await activityService.updateActivity(activityId, body);

    return NextResponse.json({ data: updatedActivity }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update activity' },
      { status: 500 }
    );
  }
}

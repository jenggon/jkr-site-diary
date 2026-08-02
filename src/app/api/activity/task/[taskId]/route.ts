import { NextResponse } from 'next/server';
import { activityService } from '@/services/activityService';

type RouteParams = {
  params: Promise<{ taskId: string }>;
};

/**
 * GET /api/activity/task/[taskId]
 * Retrieves all Activities belonging to a Task.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { taskId } = await context.params;

    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: taskId' },
        { status: 400 }
      );
    }

    const activities = await activityService.getActivitiesByTask(taskId);

    return NextResponse.json({ data: activities }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve activities by task' },
      { status: 500 }
    );
  }
}

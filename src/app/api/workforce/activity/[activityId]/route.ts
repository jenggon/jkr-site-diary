import { NextResponse } from 'next/server';
import { workforceService } from '@/composition/workforceComposition';
import { isFailure } from '@/lib/result';

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

    const result = await workforceService.getWorkforceByActivity(activityId);

    if (isFailure(result)) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: result.value }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve workforce records by activity' },
      { status: 500 }
    );
  }
}

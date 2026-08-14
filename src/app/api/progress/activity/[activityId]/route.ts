import { NextResponse } from 'next/server';
import { createProgressService } from '@/composition/progressComposition';
import { isFailure } from '@/lib/result';

type RouteParams = {
  params: Promise<{ activityId: string }>;
};

/**
 * GET /api/progress/activity/[activityId]
 * Retrieves all Progress records for a specific Activity.
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

    const progressService = createProgressService();
    const result = await progressService.getProgressByActivity(activityId);

    if (isFailure(result)) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ data: result.value }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve progress records' },
      { status: 500 }
    );
  }
}

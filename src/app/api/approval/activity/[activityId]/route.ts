import { NextResponse } from 'next/server';
import { approvalService } from '@/composition/approvalComposition';
import { isFailure } from '@/lib/result';

type RouteParams = {
  params: Promise<{ activityId: string }>;
};

/**
 * GET /api/approval/activity/[activityId]
 * Retrieves all Approval records belonging to an Activity.
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

    const result = await approvalService.getApprovalsByActivity(activityId);

    if (isFailure(result)) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ data: result.value }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

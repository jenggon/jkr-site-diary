import { NextResponse } from 'next/server';
import { approvalService } from '@/services/approvalService';

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

    const approvals = await approvalService.getApprovalsByActivity(activityId);

    return NextResponse.json({ data: approvals }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve approvals by activity' },
      { status: 500 }
    );
  }
}

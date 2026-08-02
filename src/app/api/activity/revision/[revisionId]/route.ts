import { NextResponse } from 'next/server';
import { activityService } from '@/services/activityService';

type RouteParams = {
  params: Promise<{ revisionId: string }>;
};

/**
 * GET /api/activity/revision/[revisionId]
 * Retrieves all Activities belonging to a Programme Revision.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { revisionId } = await context.params;

    if (!revisionId || typeof revisionId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: revisionId' },
        { status: 400 }
      );
    }

    const activities = await activityService.getActivitiesByRevision(revisionId);

    return NextResponse.json({ data: activities }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve activities by revision' },
      { status: 500 }
    );
  }
}

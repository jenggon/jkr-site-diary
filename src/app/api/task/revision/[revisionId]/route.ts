import { NextResponse } from 'next/server';
import { taskService } from '@/services/taskService';

type RouteParams = {
  params: Promise<{ revisionId: string }>;
};

/**
 * GET /api/task/revision/[revisionId]
 * Retrieves all Tasks for a Programme Revision.
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

    const tasks = await taskService.getTasksByRevision(revisionId);

    return NextResponse.json({ data: tasks }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve tasks by revision' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { createTaskReadRepository } from '@/composition/taskReadComposition';

type RouteParams = {
  params: Promise<{ revisionId: string }>;
};

/**
 * GET /api/task/revision/[revisionId]
 * Retrieves all Tasks for a Programme Revision.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { revisionId } = await context.params;

    if (!revisionId || typeof revisionId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: revisionId' },
        { status: 400 }
      );
    }

    const tasks = await createTaskReadRepository(identity.accessToken).getTasksByRevision(
      revisionId
    );

    return NextResponse.json({ data: tasks }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: 'Failed to retrieve tasks by revision' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { extractIdentity } from '@/app/api/_shared/identity';
import { taskService } from '@/services/taskService';

/**
 * POST /api/task
 * Creates a new Task record.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid payload: Request body must be a valid JSON object' },
        { status: 400 }
      );
    }

    const actorId = await extractIdentity(request);
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { programme_id, revision_id, task_uid, task_name } = body;

    if (!programme_id || typeof programme_id !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: programme_id' },
        { status: 400 }
      );
    }

    if (!revision_id || typeof revision_id !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: revision_id' },
        { status: 400 }
      );
    }

    if (task_uid === undefined || typeof task_uid !== 'number') {
      return NextResponse.json(
        { error: 'Missing or invalid required field: task_uid (must be a number)' },
        { status: 400 }
      );
    }

    if (!task_name || typeof task_name !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: task_name' },
        { status: 400 }
      );
    }



    const task = await taskService.createTask({ ...body, created_by: actorId });
    return NextResponse.json({ data: task }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

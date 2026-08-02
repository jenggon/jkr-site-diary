import { NextResponse } from 'next/server';
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

    const { programme_id, revision_id, task_uid, task_name, created_by } = body;

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

    if (!created_by || typeof created_by !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: created_by' },
        { status: 400 }
      );
    }

    const task = await taskService.createTask(body);
    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create task' },
      { status: 500 }
    );
  }
}

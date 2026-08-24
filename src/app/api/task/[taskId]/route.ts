import { NextResponse } from 'next/server';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { getSupabaseAuthenticatedClient } from '@/lib/supabase';
import { ResidualAtomicRepository } from '@/repositories/atomic/ResidualAtomicRepository';
import { createTaskReadRepository } from '@/composition/taskReadComposition';

type RouteParams = {
  params: Promise<{ taskId: string }>;
};

/**
 * GET /api/task/[taskId]
 * Retrieves a Task by ID.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await context.params;

    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: taskId' },
        { status: 400 }
      );
    }

    const task = await createTaskReadRepository(identity.accessToken).getTaskById(taskId);

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: task }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: 'Failed to retrieve task' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/task/[taskId]
 * Updates an existing Task.
 */
export async function PATCH(request: Request, context: RouteParams) {
  try {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { taskId } = await context.params;

    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: taskId' },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid payload: Request body must be a valid JSON object' },
        { status: 400 }
      );
    }

    const updatedTask = await new ResidualAtomicRepository(
      getSupabaseAuthenticatedClient(identity.accessToken)
    ).updateTask(taskId, body, identity.actorId);

    return NextResponse.json({ data: updatedTask }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update task' },
      { status: 500 }
    );
  }
}

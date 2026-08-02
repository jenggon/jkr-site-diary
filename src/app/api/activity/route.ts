import { NextResponse } from 'next/server';
import { activityService } from '@/services/activityService';

/**
 * POST /api/activity
 * Creates a new Activity operational record.
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

    const { programme_id, revision_id, task_id, subtask, activity_date, notes, submitted_by } = body;

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

    if (!task_id || typeof task_id !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: task_id' },
        { status: 400 }
      );
    }

    if (!subtask || typeof subtask !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: subtask' },
        { status: 400 }
      );
    }

    if (!activity_date || typeof activity_date !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: activity_date' },
        { status: 400 }
      );
    }

    if (!notes || typeof notes !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: notes' },
        { status: 400 }
      );
    }

    if (!submitted_by || typeof submitted_by !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: submitted_by' },
        { status: 400 }
      );
    }

    const activity = await activityService.createActivity(body);
    return NextResponse.json({ data: activity }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create activity' },
      { status: 500 }
    );
  }
}

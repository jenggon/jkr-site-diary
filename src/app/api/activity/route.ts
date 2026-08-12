import { NextResponse } from 'next/server';
import { createOpenActivityService } from '@/composition/activityComposition';
import { extractIdentity } from '@/app/api/_shared/identity';
import { z } from 'zod';
import { isValidUuid } from '@/lib/uuid';
import { isFailure } from '@/lib/result';
import { mapErrorToHttpStatus } from '@/app/api/_shared/httpErrorMapper';

const createActivitySchema = z.object({
  programme_id: z.string().refine(isValidUuid, 'Invalid UUID for programme_id'),
  revision_id: z.string().refine(isValidUuid, 'Invalid UUID for revision_id'),
  task_id: z.string().refine(isValidUuid, 'Invalid UUID for task_id'),
  subtask: z.string().min(1, 'subtask is required'),
});

/**
 * POST /api/activity
 * Creates a new Activity operational record.
 */
export async function POST(request: Request) {
  try {
    const actorId = await extractIdentity(request);
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid identity' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid payload: Request body must be a valid JSON object' },
        { status: 400 }
      );
    }

    const parseResult = createActivitySchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ error: `Validation failed: ${errorMsg}` }, { status: 400 });
    }

    const openActivityService = createOpenActivityService();
    const result = await openActivityService.createActivity({
      programmeId: parseResult.data.programme_id,
      revisionId: parseResult.data.revision_id,
      taskId: parseResult.data.task_id,
      activityName: parseResult.data.subtask,
      createdBy: actorId,
    });

    if (isFailure(result)) {
      return NextResponse.json(
        { error: result.error.message },
        { status: mapErrorToHttpStatus(result.error) }
      );
    }

    return NextResponse.json({ data: result.value }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create activity' },
      { status: 500 }
    );
  }
}

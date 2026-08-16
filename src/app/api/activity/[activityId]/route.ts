import { NextResponse } from 'next/server';
import { createOpenActivityService } from '@/composition/activityComposition';
import { ActivityRepository } from '@/repositories/activityRepository';
import { SupabaseDatabaseAdapter } from '@/repositories/adapters/SupabaseDatabaseAdapter';
import { supabase } from '@/lib/supabase';
import { extractIdentity, extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { isFailure } from '@/lib/result';
import { mapErrorToHttpStatus } from '@/app/api/_shared/httpErrorMapper';

type RouteParams = {
  params: Promise<{ activityId: string }>;
};

/**
 * GET /api/activity/[activityId]
 * Retrieves an Activity by ID.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid identity' }, { status: 401 });
    }

    const { activityId } = await context.params;

    if (!activityId || typeof activityId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: activityId' },
        { status: 400 }
      );
    }

    const repo = new ActivityRepository(new SupabaseDatabaseAdapter(supabase));
    const result = await repo.findById(activityId);

    if (isFailure(result)) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    if (!result.value) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: result.value }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve activity' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/activity/[activityId]
 * Updates an existing Activity.
 */
export async function PATCH(request: Request, context: RouteParams) {
  try {
    const actorId = await extractIdentity(request);
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid identity' }, { status: 401 });
    }

    const { activityId } = await context.params;

    if (!activityId || typeof activityId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: activityId' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid payload: Request body must be a valid JSON object' },
        { status: 400 }
      );
    }

    const openActivityService = createOpenActivityService(identity.accessToken);
    const result = await openActivityService.updateActivity({
      activityId,
      activityName: body.subtask,
      updatedBy: identity.actorId
    });

    if (isFailure(result)) {
      return NextResponse.json(
        { error: result.error.message },
        { status: mapErrorToHttpStatus(result.error) }
      );
    }

    return NextResponse.json({ data: result.value }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update activity' },
      { status: 500 }
    );
  }
}

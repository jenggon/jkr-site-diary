import { NextResponse } from 'next/server';
import { workforceService, createWorkforceService } from '@/composition/workforceComposition';
import { isFailure } from '@/lib/result';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';

type RouteParams = {
  params: Promise<{ workforceId: string }>;
};

/**
 * GET /api/workforce/[workforceId]
 * Retrieves a Workforce record by ID.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { workforceId } = await context.params;

    if (!workforceId || typeof workforceId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: workforceId' },
        { status: 400 }
      );
    }

    const result = await workforceService.getWorkforceById(workforceId);

    if (isFailure(result)) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    if (!result.value) {
      return NextResponse.json(
        { error: 'Workforce record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: result.value }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/workforce/[workforceId]
 * Updates an existing Workforce record.
 */
export async function PATCH(request: Request, context: RouteParams) {
  try {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { workforceId } = await context.params;

    if (!workforceId || typeof workforceId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: workforceId' },
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

    const result = await createWorkforceService(identity.accessToken).updateWorkforce(workforceId, { ...body, actor_id: identity.actorId });

    if (isFailure(result)) {
      const status = result.error.httpStatus;
      return status >= 500
        ? NextResponse.json({ error: 'Internal server error' }, { status: 500 })
        : NextResponse.json({ error: result.error.message }, { status });
    }

    return NextResponse.json({ data: result.value }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

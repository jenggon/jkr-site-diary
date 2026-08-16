import { NextResponse } from 'next/server';
import { createProgressService } from '@/composition/progressComposition';
import { isFailure } from '@/lib/result';
import { ValidationError, InfrastructureError } from '@/lib/errors';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';

type RouteParams = {
  params: Promise<{ progressId: string }>;
};

/**
 * GET /api/progress/[progressId]
 * Retrieves a Progress record by ID.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { progressId } = await context.params;

    if (!progressId || typeof progressId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: progressId' },
        { status: 400 }
      );
    }

    const progressService = createProgressService();
    const result = await progressService.getProgressById(progressId);

    if (isFailure(result)) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    if (!result.value) {
      return NextResponse.json(
        { error: 'Progress record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: result.value }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve progress record' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/progress/[progressId]
 * Updates an existing Progress record.
 */
export async function PATCH(request: Request, context: RouteParams) {
  try {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { progressId } = await context.params;

    if (!progressId || typeof progressId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: progressId' },
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

    const progressService = createProgressService(identity.accessToken);
    const result = await progressService.updateProgress(progressId, body, identity.actorId);

    if (isFailure(result)) {
      const status = result.error instanceof ValidationError ? 400 : 500;
      return NextResponse.json({ error: result.error.message }, { status });
    }

    return NextResponse.json({ data: result.value }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update progress record' },
      { status: 500 }
    );
  }
}

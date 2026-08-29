import { NextResponse } from 'next/server';
import { approvalService, createApprovalService } from '@/composition/approvalComposition';
import { isFailure } from '@/lib/result';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';

type RouteParams = {
  params: Promise<{ approvalId: string }>;
};

/**
 * GET /api/approval/[approvalId]
 * Retrieves an Approval record by ID.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { approvalId } = await context.params;

    if (!approvalId || typeof approvalId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: approvalId' },
        { status: 400 }
      );
    }

    const result = await approvalService.getApprovalById(approvalId);

    if (isFailure(result)) {
      const status = result.error.httpStatus || 500;
      return NextResponse.json(
        { error: status >= 500 ? 'Internal server error' : result.error.message },
        { status: status >= 500 ? 500 : status }
      );
    }

    if (!result.value) {
      return NextResponse.json(
        { error: 'Approval record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: result.value }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/approval/[approvalId]
 * Updates an existing Approval record.
 */
export async function PATCH(request: Request, context: RouteParams) {
  try {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { approvalId } = await context.params;

    if (!approvalId || typeof approvalId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: approvalId' },
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

    const result = await createApprovalService(identity.accessToken).updateApproval(approvalId, {
      ...body,
      approved_by: identity.actorId,
    });

    if (isFailure(result)) {
      const status = result.error.httpStatus || 400;
      return NextResponse.json(
        { error: status >= 500 ? 'Internal server error' : result.error.message },
        { status: status >= 500 ? 500 : status }
      );
    }

    return NextResponse.json({ data: result.value }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

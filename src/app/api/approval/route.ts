import { NextResponse } from 'next/server';
import { createApprovalService } from '@/composition/approvalComposition';
import { isFailure } from '@/lib/result';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';

/**
 * POST /api/approval
 * Creates a new Approval workflow request.
 */
export async function POST(request: Request) {
  try {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid payload: Request body must be a valid JSON object' },
        { status: 400 }
      );
    }

    const { programme_id, revision_id, activity_id } = body;

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

    if (!activity_id || typeof activity_id !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: activity_id' },
        { status: 400 }
      );
    }

    const result = await createApprovalService(identity.accessToken).createApproval({
      ...body,
      requested_by: identity.actorId,
    });

    if (isFailure(result)) {
      const status = result.error.httpStatus || 400;
      return NextResponse.json(
        { error: status >= 500 ? 'Internal server error' : result.error.message },
        { status: status >= 500 ? 500 : status }
      );
    }

    return NextResponse.json({ data: result.value }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

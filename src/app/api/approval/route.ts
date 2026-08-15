import { NextResponse } from 'next/server';
import { approvalService } from '@/composition/approvalComposition';
import { isFailure } from '@/lib/result';

/**
 * POST /api/approval
 * Creates a new Approval workflow request.
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

    const { programme_id, revision_id, activity_id, requested_by } = body;

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

    if (!requested_by || typeof requested_by !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: requested_by' },
        { status: 400 }
      );
    }

    const result = await approvalService.createApproval(body);

    if (isFailure(result)) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ data: result.value }, { status: 201 });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { error: err?.message || 'Failed to create approval request' },
      { status: 500 }
    );
  }
}

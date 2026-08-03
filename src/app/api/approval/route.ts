import { NextResponse } from 'next/server';
import { approvalService } from '@/services/approvalService';

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

    const approval = await approvalService.createApproval(body);
    return NextResponse.json({ data: approval }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create approval request' },
      { status: 500 }
    );
  }
}

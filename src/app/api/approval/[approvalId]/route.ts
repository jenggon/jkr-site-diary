import { NextResponse } from 'next/server';
import { approvalService } from '@/composition/approvalComposition';
import { isFailure } from '@/lib/result';

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
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    if (!result.value) {
      return NextResponse.json(
        { error: 'Approval record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: result.value }, { status: 200 });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { error: err?.message || 'Failed to retrieve approval record' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/approval/[approvalId]
 * Updates an existing Approval record.
 */
export async function PATCH(request: Request, context: RouteParams) {
  try {
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

    const result = await approvalService.updateApproval(approvalId, body);

    if (isFailure(result)) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ data: result.value }, { status: 200 });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { error: err?.message || 'Failed to update approval record' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { approvalService } from '@/services/approvalService';

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

    const approval = await approvalService.getApprovalById(approvalId);

    if (!approval) {
      return NextResponse.json(
        { error: 'Approval record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: approval }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve approval record' },
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

    const updatedApproval = await approvalService.updateApproval(approvalId, body);

    return NextResponse.json({ data: updatedApproval }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update approval record' },
      { status: 500 }
    );
  }
}

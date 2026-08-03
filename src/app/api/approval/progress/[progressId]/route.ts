import { NextResponse } from 'next/server';
import { approvalService } from '@/services/approvalService';

type RouteParams = {
  params: Promise<{ progressId: string }>;
};

/**
 * GET /api/approval/progress/[progressId]
 * Retrieves all Approval records belonging to a Progress measurement record.
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

    const approvals = await approvalService.getApprovalsByProgress(progressId);

    return NextResponse.json({ data: approvals }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve approvals by progress' },
      { status: 500 }
    );
  }
}

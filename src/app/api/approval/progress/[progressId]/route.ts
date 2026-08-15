import { NextResponse } from 'next/server';
import { approvalService } from '@/composition/approvalComposition';
import { isFailure } from '@/lib/result';

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

    const result = await approvalService.getApprovalsByProgress(progressId);

    if (isFailure(result)) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: result.value }, { status: 200 });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { error: err?.message || 'Failed to retrieve approvals by progress' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { approvalService } from '@/services/approvalService';

type RouteParams = {
  params: Promise<{ siteDiaryId: string }>;
};

/**
 * GET /api/approval/site-diary/[siteDiaryId]
 * Retrieves all Approval records belonging to a Site Diary entry.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { siteDiaryId } = await context.params;

    if (!siteDiaryId || typeof siteDiaryId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: siteDiaryId' },
        { status: 400 }
      );
    }

    const approvals = await approvalService.getApprovalsBySiteDiary(siteDiaryId);

    return NextResponse.json({ data: approvals }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve approvals by site diary' },
      { status: 500 }
    );
  }
}

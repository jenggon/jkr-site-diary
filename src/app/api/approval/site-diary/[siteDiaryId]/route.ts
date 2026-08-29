import { NextResponse } from 'next/server';
import { approvalService } from '@/composition/approvalComposition';
import { isFailure } from '@/lib/result';

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

    const result = await approvalService.getApprovalsBySiteDiary(siteDiaryId);

    if (isFailure(result)) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ data: result.value }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createProgressService } from '@/composition/progressComposition';
import { isFailure } from '@/lib/result';

type RouteParams = {
  params: Promise<{ siteDiaryId: string }>;
};

/**
 * GET /api/progress/site-diary/[siteDiaryId]
 * Retrieves all Progress records for a specific Site Diary.
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

    const progressService = createProgressService();
    const result = await progressService.getProgressBySiteDiary(siteDiaryId);

    if (isFailure(result)) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ data: result.value }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve progress records' },
      { status: 500 }
    );
  }
}

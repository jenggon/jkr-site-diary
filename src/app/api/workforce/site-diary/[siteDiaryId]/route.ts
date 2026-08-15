import { NextResponse } from 'next/server';
import { workforceService } from '@/composition/workforceComposition';
import { isFailure } from '@/lib/result';

type RouteParams = {
  params: Promise<{ siteDiaryId: string }>;
};

/**
 * GET /api/workforce/site-diary/[siteDiaryId]
 * Retrieves all Workforce records belonging to a Site Diary entry.
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

    const result = await workforceService.getWorkforceBySiteDiary(siteDiaryId);

    if (isFailure(result)) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: result.value }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve workforce records by site diary' },
      { status: 500 }
    );
  }
}

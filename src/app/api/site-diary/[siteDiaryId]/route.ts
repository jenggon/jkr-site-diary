import { NextResponse } from 'next/server';
import { createSiteDiaryService } from '@/composition/siteDiaryComposition';

type RouteParams = {
  params: Promise<{ siteDiaryId: string }>;
};

/**
 * GET /api/site-diary/[siteDiaryId]
 * Retrieves a Site Diary record by ID.
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

    const siteDiaryService = createSiteDiaryService();
    const siteDiary = await siteDiaryService.getSiteDiaryById(siteDiaryId);

    if (!siteDiary) {
      return NextResponse.json(
        { error: 'Site diary record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: siteDiary }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve site diary' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/site-diary/[siteDiaryId]
 * Updates an existing Site Diary record.
 */
export async function PATCH(request: Request, context: RouteParams) {
  try {
    const { siteDiaryId } = await context.params;

    if (!siteDiaryId || typeof siteDiaryId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: siteDiaryId' },
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

    const siteDiaryService = createSiteDiaryService();
    const updatedSiteDiary = await siteDiaryService.updateSiteDiary(siteDiaryId, body);

    return NextResponse.json({ data: updatedSiteDiary }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update site diary' },
      { status: 500 }
    );
  }
}

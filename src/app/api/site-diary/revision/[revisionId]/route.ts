import { NextResponse } from 'next/server';
import { siteDiaryService } from '@/services/siteDiaryService';

type RouteParams = {
  params: Promise<{ revisionId: string }>;
};

/**
 * GET /api/site-diary/revision/[revisionId]
 * Retrieves all Site Diary records belonging to a Programme Revision.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { revisionId } = await context.params;

    if (!revisionId || typeof revisionId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: revisionId' },
        { status: 400 }
      );
    }

    const siteDiaries = await siteDiaryService.getSiteDiariesByRevision(revisionId);

    return NextResponse.json({ data: siteDiaries }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve site diaries by revision' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { createSiteDiaryService } from '@/composition/siteDiaryComposition';
import { extractIdentity } from '@/app/api/_shared/identity';
import { isSuccess } from '@/lib/result';

type RouteParams = {
  params: Promise<{ revisionId: string }>;
};

/**
 * GET /api/site-diary/revision/[revisionId]
 * Retrieves all Site Diary records belonging to a Programme Revision.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const actorId = await extractIdentity(request);
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid identity' }, { status: 401 });
    }

    const { revisionId } = await context.params;

    if (!revisionId || typeof revisionId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: revisionId' },
        { status: 400 }
      );
    }

    const siteDiaryService = createSiteDiaryService();
    const result = await siteDiaryService.getSiteDiariesByRevision(revisionId);

    if (isSuccess(result)) {
      return NextResponse.json({ data: result.value }, { status: 200 });
    }

    return NextResponse.json({ error: result.error.message }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve site diaries by revision' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { createSiteDiaryManagementReadService } from '@/composition/siteDiaryManagementComposition';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { isValidUuid } from '@/lib/uuid';
import { SiteDiaryManagementReadError } from '@/services/SiteDiaryManagementReadService';

type RouteParams = {
  params: Promise<{ revisionId: string }>;
};

/**
 * GET /api/site-diary/revision/[revisionId]
 * Retrieves all Site Diary records belonging to a Programme Revision.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid identity' }, { status: 401 });
    }

    const { revisionId } = await context.params;

    const { searchParams } = new URL(request.url);
    const programmeId = searchParams.get('programmeId');
    const text = searchParams.get('text') ?? undefined;

    if (!isValidUuid(revisionId)) {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: revisionId' },
        { status: 400 }
      );
    }
    if (!programmeId || !isValidUuid(programmeId)) {
      return NextResponse.json({ error: 'Missing or invalid query parameter: programmeId' }, { status: 400 });
    }
    const service = createSiteDiaryManagementReadService(identity.accessToken);
    const data = await service.list({ programmeId, revisionId, text });
    return NextResponse.json({ data }, { status: 200 });
  } catch (error: unknown) {
    const status = error instanceof SiteDiaryManagementReadError ? error.status : 500;
    if (status >= 500) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid request' },
      { status }
    );
  }
}

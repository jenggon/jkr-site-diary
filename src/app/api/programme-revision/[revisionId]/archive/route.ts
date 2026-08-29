import { NextResponse } from 'next/server';
import { createProgrammeService } from '@/composition/programmeComposition';
import { isSuccess } from '@/lib/result';
import { extractIdentity } from '@/app/api/_shared/identity';
import { isValidUuid } from '@/lib/uuid';

type RouteParams = {
  params: Promise<{ revisionId: string }>;
};

/**
 * POST /api/programme-revision/[revisionId]/archive
 * Archives a Programme Revision via Composition Root.
 */
export async function POST(request: Request, context: RouteParams) {
  try {
    const actorId = await extractIdentity(request);
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid identity' }, { status: 401 });
    }

    const { revisionId } = await context.params;

    if (!revisionId || !isValidUuid(revisionId)) {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: revisionId' },
        { status: 400 }
      );
    }

    const service = createProgrammeService();
    const result = await service.archiveRevision(revisionId, actorId);

    if (isSuccess(result)) {
      return NextResponse.json({ data: result.value }, { status: 200 });
    }

    const status = result.error.httpStatus;
    return status >= 500
      ? NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      : NextResponse.json({ error: result.error.message }, { status });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

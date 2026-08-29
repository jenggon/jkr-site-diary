import { NextResponse } from 'next/server';
import { createProgrammeService } from '@/composition/programmeComposition';
import { isSuccess } from '@/lib/result';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';

type RouteParams = {
  params: Promise<{ programmeId: string }>;
};

/**
 * POST /api/programme/[programmeId]/archive
 * Archives a Programme via Composition Root.
 */
export async function POST(request: Request, context: RouteParams) {
  try {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { programmeId } = await context.params;

    if (!programmeId || typeof programmeId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: programmeId' },
        { status: 400 }
      );
    }

    const service = createProgrammeService({ accessToken: identity.accessToken });
    const result = await service.archiveProgramme(programmeId, identity.actorId);

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

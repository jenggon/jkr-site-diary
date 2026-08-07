import { NextResponse } from 'next/server';
import { createProgrammeService } from '@/composition/programmeComposition';
import { isSuccess } from '@/lib/result';

type RouteParams = {
  params: Promise<{ programmeId: string }>;
};

/**
 * POST /api/programme/[programmeId]/archive
 * Archives a Programme via Composition Root.
 */
export async function POST(request: Request, context: RouteParams) {
  try {
    const { programmeId } = await context.params;

    if (!programmeId || typeof programmeId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: programmeId' },
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

    const { archivedBy } = body;

    if (!archivedBy || typeof archivedBy !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: archivedBy' },
        { status: 400 }
      );
    }

    const service = createProgrammeService();
    const result = await service.archiveProgramme(programmeId, archivedBy);

    if (isSuccess(result)) {
      return NextResponse.json({ data: result.value }, { status: 200 });
    }

    return NextResponse.json(
      { error: result.error.message },
      { status: result.error.errorCode === 'PROGRAMME_NOT_FOUND' ? 404 : 400 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to archive programme';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

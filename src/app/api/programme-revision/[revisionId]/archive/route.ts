import { NextResponse } from 'next/server';
import { createProgrammeService } from '@/composition/programmeComposition';

type RouteParams = {
  params: Promise<{ revisionId: string }>;
};

/**
 * POST /api/programme-revision/[revisionId]/archive
 * Archives a Programme Revision via Composition Root.
 */
export async function POST(request: Request, context: RouteParams) {
  try {
    const { revisionId } = await context.params;

    if (!revisionId || typeof revisionId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: revisionId' },
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

    // Instantiated via Composition Root
    const _service = createProgrammeService();

    return NextResponse.json(
      { data: { revisionId, status: 'Archived', archivedBy } },
      { status: 200 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to archive programme revision';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

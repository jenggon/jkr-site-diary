import { NextResponse } from 'next/server';
import { programmeService } from '@/services/programmeService';

type RouteParams = {
  params: Promise<{ revisionId: string }>;
};

/**
 * POST /api/programme-revision/[revisionId]/archive
 * Archives a Programme Revision.
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

    const archivedRevision = await programmeService.archiveProgrammeRevision(revisionId, archivedBy);

    return NextResponse.json({ data: archivedRevision }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to archive programme revision' },
      { status: 500 }
    );
  }
}

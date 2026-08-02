import { NextResponse } from 'next/server';
import { programmeService } from '@/services/programmeService';

type RouteParams = {
  params: Promise<{ programmeId: string }>;
};

/**
 * POST /api/programme/[programmeId]/archive
 * Archives a Programme.
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

    const archivedProgramme = await programmeService.archiveProgramme(programmeId, archivedBy);

    return NextResponse.json({ data: archivedProgramme }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to archive programme' },
      { status: 500 }
    );
  }
}

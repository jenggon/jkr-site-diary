import { NextResponse } from 'next/server';
import { programmeService } from '@/services/programmeService';

type RouteParams = {
  params: Promise<{ programmeId: string }>;
};

/**
 * GET /api/programme/[programmeId]
 * Retrieves a Programme by ID.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { programmeId } = await context.params;

    if (!programmeId || typeof programmeId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: programmeId' },
        { status: 400 }
      );
    }

    const programme = await programmeService.getProgrammeById(programmeId);

    if (!programme) {
      return NextResponse.json(
        { error: 'Programme not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: programme }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve programme' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/programme/[programmeId]
 * Updates an existing Programme.
 */
export async function PATCH(request: Request, context: RouteParams) {
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

    const updatedProgramme = await programmeService.updateProgramme(programmeId, body);

    return NextResponse.json({ data: updatedProgramme }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update programme' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { createProgrammeService } from '@/composition/programmeComposition';
import { isSuccess } from '@/lib/result';

type RouteParams = {
  params: Promise<{ revisionId: string }>;
};

/**
 * POST /api/programme-revision/[revisionId]/approve
 * Approves a Programme Revision via Composition Root.
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

    const { approvedBy } = body;

    if (!approvedBy || typeof approvedBy !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: approvedBy' },
        { status: 400 }
      );
    }

    const service = createProgrammeService();
    const result = await service.approveRevision(revisionId, approvedBy);

    if (isSuccess(result)) {
      return NextResponse.json({ data: result.value }, { status: 200 });
    }

    return NextResponse.json(
      { error: result.error.message },
      { status: result.error.errorCode === 'PROGRAMME_NOT_FOUND' ? 404 : 400 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to approve programme revision';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

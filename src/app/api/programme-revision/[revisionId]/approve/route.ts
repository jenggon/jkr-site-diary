import { NextResponse } from 'next/server';
import { programmeService } from '@/services/programmeService';

type RouteParams = {
  params: Promise<{ revisionId: string }>;
};

/**
 * POST /api/programme-revision/[revisionId]/approve
 * Approves a Programme Revision.
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

    const { approvedBy, approvalDate, effectiveDate } = body;

    if (!approvedBy || typeof approvedBy !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: approvedBy' },
        { status: 400 }
      );
    }

    if (!approvalDate || typeof approvalDate !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: approvalDate' },
        { status: 400 }
      );
    }

    if (!effectiveDate || typeof effectiveDate !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: effectiveDate' },
        { status: 400 }
      );
    }

    const approvedRevision = await programmeService.approveProgrammeRevision(
      revisionId,
      approvedBy,
      approvalDate,
      effectiveDate
    );

    return NextResponse.json({ data: approvedRevision }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to approve programme revision' },
      { status: 500 }
    );
  }
}

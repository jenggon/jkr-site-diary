import { NextResponse } from 'next/server';
import { extractIdentity } from '@/app/api/_shared/identity';
import { createProgrammeService } from '@/composition/programmeComposition';
import { isSuccess } from '@/lib/result';

type RouteParams = {
  params: Promise<{ programmeId: string }>;
};

/**
 * GET /api/programme/[programmeId]
 * Retrieves a Programme by ID via Composition Root.
 */
export async function GET(_request: Request, context: RouteParams) {
  try {
    const { programmeId } = await context.params;

    if (!programmeId || typeof programmeId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: programmeId' },
        { status: 400 }
      );
    }

    const service = createProgrammeService();
    const result = await service.getProgramme(programmeId);

    if (isSuccess(result)) {
      if (!result.value) {
        return NextResponse.json({ error: 'Programme not found' }, { status: 404 });
      }
      return NextResponse.json({ data: result.value }, { status: 200 });
    }

    return NextResponse.json({ error: result.error.message }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to retrieve programme';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PATCH /api/programme/[programmeId]
 * Updates an existing Programme via Composition Root.
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

    const actorId = await extractIdentity(request);
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = createProgrammeService();
    const result = await service.updateProgramme({
      programmeId,
      programmeName: body.programme_name ?? body.programmeName,
      employerName: body.employer_name ?? body.employerName,
      contractorName: body.contractor_name ?? body.contractorName,
      supervisingOfficer: body.supervising_officer ?? body.supervisingOfficer,
      contractStartDate: body.contract_start_date ?? body.contractStartDate,
      contractCompletionDate: body.contract_completion_date ?? body.contractCompletionDate,
      defectLiabilityEnd: body.defect_liability_end ?? body.defectLiabilityEnd,
      updatedBy: actorId,
    });

    if (isSuccess(result)) {
      return NextResponse.json({ data: result.value }, { status: 200 });
    }

    return NextResponse.json(
      { error: result.error.message },
      { status: result.error.errorCode === 'PROGRAMME_NOT_FOUND' ? 404 : 400 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update programme';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

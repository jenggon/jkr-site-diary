import { NextResponse } from 'next/server';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { createProgrammeService } from '@/composition/programmeComposition';
import { isSuccess } from '@/lib/result';

/**
 * GET /api/programme/[programmeId]
 * Retrieves a Programme by ID via Composition Root.
 */
export async function GET(request: Request, { params }: { params: Promise<{ programmeId: string }> }) {
  try {
    const { programmeId } = await params;
    const identity = await extractVerifiedIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = createProgrammeService({ accessToken: identity.accessToken });
    const result = await service.getProgramme(programmeId);

    if (isSuccess(result)) {
      if (!result.value) {
        return NextResponse.json({ error: 'Programme not found' }, { status: 404 });
      }
      return NextResponse.json({ data: result.value }, { status: 200 });
    }

    return NextResponse.json({ error: 'Failed to retrieve programme' }, { status: 500 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve programme' }, { status: 500 });
  }
}

/**
 * PATCH /api/programme/[programmeId]
 * Updates an existing Programme via Composition Root.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ programmeId: string }> }) {
  try {
    const { programmeId } = await params;
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const identity = await extractVerifiedIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = createProgrammeService({ accessToken: identity.accessToken });
    const result = await service.updateProgramme({
      programmeId,
      programmeName: body.programme_name ?? body.programmeName,
      employerName: body.employer_name ?? body.employerName,
      contractorName: body.contractor_name ?? body.contractorName,
      supervisingOfficer: body.supervising_officer ?? body.supervisingOfficer,
      contractStartDate: body.contract_start_date ?? body.contractStartDate,
      contractCompletionDate: body.contract_completion_date ?? body.contractCompletionDate,
      defectLiabilityEnd: body.defect_liability_end ?? body.defectLiabilityEnd,
      updatedBy: identity.actorId,
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

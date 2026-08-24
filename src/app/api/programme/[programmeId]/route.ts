import { NextResponse } from 'next/server';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { createProgrammeService } from '@/composition/programmeComposition';
import { isSuccess } from '@/lib/result';

type RouteParams = {
  params: Promise<{ programmeId: string }>;
};

/**
 * GET /api/programme/[programmeId]
 * Retrieves a Programme by ID via Composition Root.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { programmeId } = await context.params;

    if (!programmeId || typeof programmeId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: programmeId' },
        { status: 400 }
      );
    }

    const service = createProgrammeService({ accessToken: identity.accessToken });
    const result = await service.getProgramme(programmeId);

    if (isSuccess(result)) {
      if (!result.value) {
        return NextResponse.json({ error: 'Programme not found' }, { status: 404 });
      }
      return NextResponse.json({ data: result.value }, { status: 200 });
    }

    const notFound = result.error.errorCode === 'PROGRAMME_NOT_FOUND';
    return NextResponse.json(
      { error: notFound ? 'Programme not found' : 'Failed to retrieve programme' },
      { status: notFound ? 404 : 500 },
    );
  } catch {
    return NextResponse.json({ error: 'Failed to retrieve programme' }, { status: 500 });
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
        { status: 400 },
      );
    }

    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid payload: Request body must be a valid JSON object' },
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

    // Explicit safe HTTP/domain mapping for errors, never expose arbitrary message
    if (result.error.errorCode === 'PROGRAMME_NOT_FOUND') {
      return NextResponse.json({ error: 'Programme not found' }, { status: 404 });
    }
    if (result.error.errorCode === 'PROGRAMME_ARCHIVED' || result.error.errorCode === 'PROGRAMME_LOCKED') {
      return NextResponse.json({ error: 'Programme cannot be updated in its current state' }, { status: 409 });
    }
    if (result.error.errorCode === 'PROGRAMME_VALIDATION_ERROR') {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }
    
    // Everything else is a generic 500
    return NextResponse.json({ error: 'Failed to update programme' }, { status: 500 });

  } catch (error: unknown) {
    // Unexpected error: HTTP 500 { error: 'Failed to update programme' }
    return NextResponse.json({ error: 'Failed to update programme' }, { status: 500 });
  }
}

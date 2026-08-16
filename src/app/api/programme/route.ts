import { NextResponse } from 'next/server';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { createProgrammeService } from '@/composition/programmeComposition';
import { isSuccess } from '@/lib/result';

/**
 * POST /api/programme
 * Creates a new Programme record via Composition Root.
 */
export async function POST(request: Request) {
  try {
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

    const { programme_code, programme_name } = body;

    if (!programme_code || typeof programme_code !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: programme_code' },
        { status: 400 }
      );
    }

    if (!programme_name || typeof programme_name !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: programme_name' },
        { status: 400 }
      );
    }



    const service = createProgrammeService({ accessToken: identity.accessToken });
    const result = await service.createProgramme({
      programmeCode: programme_code,
      programmeName: programme_name,
      employerName: body.employer_name,
      contractorName: body.contractor_name,
      supervisingOfficer: body.supervising_officer,
      contractStartDate: body.contract_start_date,
      contractCompletionDate: body.contract_completion_date,
      defectLiabilityEnd: body.defect_liability_end,
      createdBy: identity.actorId,
    });

    if (isSuccess(result)) {
      return NextResponse.json({ data: result.value }, { status: 201 });
    }

    return NextResponse.json(
      { error: result.error.message },
      { status: result.error.errorCode === 'PROGRAMME_ALREADY_EXISTS' ? 409 : 400 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create programme';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

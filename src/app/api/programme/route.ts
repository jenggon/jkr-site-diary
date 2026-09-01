import { NextResponse } from 'next/server';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { createProgrammeService } from '@/composition/programmeComposition';
import { isSuccess } from '@/lib/result';
import { ProgrammeStatus } from '@/types/programme';
import { mapProgrammeToResponseDTO } from '@/mappers/programmeMapper';

/**
 * GET /api/programme
 * Lists programmes using ProgrammeService via Composition Root.
 * Canonical discovery endpoint for Programme context.
 */
export async function GET(request: Request) {
  try {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    const status = statusParam ? (statusParam as ProgrammeStatus) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;

    const service = createProgrammeService({ accessToken: identity.accessToken });
    const result = await service.listProgrammes({ status, limit, offset });

    if (isSuccess(result)) {
      const dtos = result.value.map(mapProgrammeToResponseDTO);
      return NextResponse.json({ data: dtos }, { status: 200 });
    }

    const errorStatus = result.error.httpStatus;
    return errorStatus >= 500
      ? NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      : NextResponse.json({ error: result.error.message }, { status: errorStatus });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const programmeShortName = body.programme_short_name ?? body.programmeShortName;

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

    if (!programmeShortName || typeof programmeShortName !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: programme_short_name' },
        { status: 400 },
      );
    }

    const service = createProgrammeService({ accessToken: identity.accessToken });
    const result = await service.createProgramme({
      programmeCode: programme_code,
      programmeName: programme_name,
      programmeShortName,
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

    const errorStatus = result.error.httpStatus;
    return errorStatus >= 500
      ? NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      : NextResponse.json({ error: result.error.message }, { status: errorStatus });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

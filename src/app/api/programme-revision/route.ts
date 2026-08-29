import { NextResponse } from 'next/server';
import { createProgrammeService } from '@/composition/programmeComposition';
import { isSuccess } from '@/lib/result';
import { z } from 'zod';
import { extractIdentity, extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { isValidUuid } from '@/lib/uuid';
import { createSiteDiaryManagementReadService } from '@/composition/siteDiaryManagementComposition';

export async function GET(request: Request) {
  try {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid identity' }, { status: 401 });
    }
    const programmeId = new URL(request.url).searchParams.get('programmeId');
    if (!programmeId || !isValidUuid(programmeId)) {
      return NextResponse.json({ error: 'Missing or invalid query parameter: programmeId' }, { status: 400 });
    }
    const service = createSiteDiaryManagementReadService(identity.accessToken);
    return NextResponse.json({ data: await service.listRevisions(programmeId) }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const createRevisionSchema = z.object({
  programmeId: z.string().refine(isValidUuid, 'Invalid UUID format for programmeId'),
  revisionTitle: z.string().min(1, 'revisionTitle is required').max(200, 'revisionTitle too long'),
  description: z.string().max(1000, 'description too long').optional(),
});

export async function POST(request: Request) {
  try {
    const actorId = await extractIdentity(request);
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid identity' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid payload: Request body must be a valid JSON object' }, { status: 400 });
    }

    const parseResult = createRevisionSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ error: `Validation failed: ${errorMsg}` }, { status: 400 });
    }

    const service = createProgrammeService();
    const result = await service.createRevision({
      programmeId: parseResult.data.programmeId,
      revisionTitle: parseResult.data.revisionTitle,
      description: parseResult.data.description,
      createdBy: actorId,
    });

    if (isSuccess(result)) {
      return NextResponse.json({ data: result.value }, { status: 201 });
    }

    const status = result.error.httpStatus;
    return status >= 500
      ? NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      : NextResponse.json({ error: result.error.message }, { status });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

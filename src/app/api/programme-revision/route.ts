import { NextResponse } from 'next/server';
import { createProgrammeService } from '@/composition/programmeComposition';
import { isSuccess } from '@/lib/result';
import { z } from 'zod';
import { extractIdentity } from '@/app/api/_shared/identity';
import { isValidUuid } from '@/lib/uuid';

const createRevisionSchema = z.object({
  programmeId: z.string().refine(isValidUuid, 'Invalid UUID format for programmeId'),
  revisionTitle: z.string().min(1, 'revisionTitle is required').max(200, 'revisionTitle too long'),
  description: z.string().max(1000, 'description too long').optional(),
});

export async function POST(request: Request) {
  try {
    const actorId = extractIdentity(request);
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

    const status = result.error.errorCode === 'PROGRAMME_NOT_FOUND' ? 404 : 400;
    return NextResponse.json({ error: result.error.message }, { status });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create programme revision';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

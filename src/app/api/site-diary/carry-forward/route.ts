import { NextRequest, NextResponse } from 'next/server';
import { createSiteDiaryService } from '@/composition/siteDiaryComposition';
import { isFailure } from '@/lib/result';
import { extractIdentity } from '@/app/api/_shared/identity';
import { z } from 'zod';
import { isValidUuid } from '@/lib/uuid';
import { isValidIso8601 } from '@/lib/clock';

const carryForwardSchema = z.object({
  programmeId: z.string().refine(isValidUuid, 'Invalid UUID for programmeId').optional(),
  activityId: z.string().refine(isValidUuid, 'Invalid UUID for activityId').optional(),
  targetDate: z.string().refine(isValidIso8601, 'Invalid ISO8601 format for targetDate'),
}).refine(data => data.programmeId || data.activityId, {
  message: 'Either programmeId or activityId must be provided',
  path: ['programmeId', 'activityId']
});

export async function POST(req: NextRequest) {
  try {
    const actorId = await extractIdentity(req);
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid identity' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid payload: Request body must be a valid JSON object' },
        { status: 400 }
      );
    }

    const parseResult = carryForwardSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ error: `Validation failed: ${errorMsg}` }, { status: 400 });
    }

    const { programmeId, activityId, targetDate } = parseResult.data;
    const siteDiaryService = createSiteDiaryService();

    if (activityId) {
      const result = await siteDiaryService.continueYesterday(activityId, targetDate, actorId);
      if (isFailure(result)) {
        return NextResponse.json({ error: result.error.message }, { status: result.error.httpStatus || 400 });
      }
      return NextResponse.json({ data: result.value });
    } else if (programmeId) {
      const result = await siteDiaryService.carryForwardActiveOperations(programmeId, targetDate, actorId);
      if (isFailure(result)) {
        return NextResponse.json({ error: result.error.message }, { status: result.error.httpStatus || 400 });
      }
      return NextResponse.json({ data: result.value });
    } else {
      return NextResponse.json(
        { error: 'Either activityId or programmeId is required' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createOpenActivityService } from '@/composition/activityComposition';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { isFailure } from '@/lib/result';
import { z } from 'zod';
import { mapErrorToHttpStatus } from '@/app/api/_shared/httpErrorMapper';
import { ActivitySourceType } from '@/types/activity';

const createActivitySchema = z.object({
  programmeId: z.string().uuid(),
  revisionId: z.string().uuid(),
  sourceType: z.nativeEnum(ActivitySourceType).optional().default(ActivitySourceType.MSP),
  taskId: z.string().uuid().optional(),
  voItemId: z.string().uuid().optional(),
  activityName: z.string().min(1),
}).superRefine((value, ctx) => {
  if (value.sourceType === ActivitySourceType.MSP) {
    if (!value.taskId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['taskId'], message: 'MSP Activity requires taskId' });
    if (value.voItemId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['voItemId'], message: 'MSP Activity forbids voItemId' });
  }
  if (value.sourceType === ActivitySourceType.VO) {
    if (!value.voItemId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['voItemId'], message: 'VO Activity requires voItemId' });
    if (value.taskId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['taskId'], message: 'VO Activity forbids taskId' });
  }
});

export async function POST(request: Request) {
  try {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid identity' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid payload: Request body must be a valid JSON object' }, { status: 400 });
    }

    const parseResult = createActivitySchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ error: `Validation failed: ${errorMsg}` }, { status: 400 });
    }

    const openActivityService = createOpenActivityService(identity.accessToken);
    const result = await openActivityService.createActivity({
      programmeId: parseResult.data.programmeId,
      revisionId: parseResult.data.revisionId,
      sourceType: parseResult.data.sourceType,
      taskId: parseResult.data.taskId,
      voItemId: parseResult.data.voItemId,
      activityName: parseResult.data.activityName,
      createdBy: identity.actorId,
    });

    if (isFailure(result)) {
      const status = mapErrorToHttpStatus(result.error);
      return status >= 500
        ? NextResponse.json({ error: 'Internal server error' }, { status: 500 })
        : NextResponse.json({ error: result.error.message }, { status });
    }

    return NextResponse.json({ data: result.value }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

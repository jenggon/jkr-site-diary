import { NextResponse } from 'next/server';
import { createSiteDiaryService } from '@/composition/siteDiaryComposition';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { z } from 'zod';
import { isValidUuid } from '@/lib/uuid';
import { isValidIso8601 } from '@/lib/clock';
import { isSuccess } from '@/lib/result';

const timeValue = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid HH:MM time').nullable();
const printContextSchema = z.object({
  location: z.string().max(240).default(''),
  work_start_time: timeValue.optional().default(null),
  work_end_time: timeValue.optional().default(null),
  weather_condition: z.enum(['ELOK', 'HUJAN', 'MENDUNG', 'RIBUT']).nullable().optional().default(null),
  rain_start_time: timeValue.optional().default(null),
  rain_end_time: timeValue.optional().default(null),
  contractor_scope: z.enum(['CONTRACTOR', 'NSC']).default('CONTRACTOR'),
}).optional();

const createSiteDiarySchema = z.object({
  programme_id: z.string().refine(isValidUuid, 'Invalid UUID for programme_id'),
  revision_id: z.string().refine(isValidUuid, 'Invalid UUID for revision_id'),
  activity_id: z.string().refine(isValidUuid, 'Invalid UUID for activity_id'),
  activity_date: z.string().refine(isValidIso8601, 'Invalid ISO8601 format for activity_date'),
  operation_intent: z.enum(['IN_PROGRESS_DIARY', 'FINAL_COMPLETION_DIARY']).optional(),
  weather: z.string().nullable().optional(),
  notes: z.string().min(1, 'notes cannot be empty'),
  manpower: z.any().optional(),
  print_context: printContextSchema,
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

    const parseResult = createSiteDiarySchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ error: `Validation failed: ${errorMsg}` }, { status: 400 });
    }

    const siteDiaryService = createSiteDiaryService(identity.accessToken);
    const result = await siteDiaryService.createSiteDiary({
      programmeId: parseResult.data.programme_id,
      revisionId: parseResult.data.revision_id,
      activityId: parseResult.data.activity_id,
      activityDate: parseResult.data.activity_date,
      operationIntent: parseResult.data.operation_intent,
      weather: parseResult.data.weather as any,
      notes: parseResult.data.notes,
      manpower: parseResult.data.manpower as any,
      printContext: parseResult.data.print_context as any,
      submittedBy: identity.actorId,
    });

    if (isSuccess(result)) {
      return NextResponse.json({ data: result.value }, { status: 201 });
    }
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create site diary' }, { status: 500 });
  }
}

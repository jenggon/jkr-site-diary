import { NextResponse } from 'next/server';
import { createSiteDiaryService } from '@/composition/siteDiaryComposition';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { z } from 'zod';
import { isSuccess } from '@/lib/result';

type RouteParams = {
  params: Promise<{ siteDiaryId: string }>;
};

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

const updateSiteDiarySchema = z.object({
  expected_last_modified_at: z.string().datetime({ offset: true }),
  weather: z.enum(['Sunny', 'Cloudy', 'Rainy', 'HeavyRain']).nullable().optional(),
  notes: z.string().optional(),
  manpower: z.array(z.object({
    trade_name: z.string(),
    bumi_count: z.number().int().min(0),
    non_bumi_count: z.number().int().min(0),
    foreign_count: z.number().int().min(0)
  })).nullable().optional(),
  print_context: printContextSchema,
});

export async function GET(request: Request, context: RouteParams) {
  try {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) return NextResponse.json({ error: 'Unauthorized: Missing or invalid identity' }, { status: 401 });
    const { siteDiaryId } = await context.params;
    if (!siteDiaryId || typeof siteDiaryId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid route parameter: siteDiaryId' }, { status: 400 });
    }

    const result = await createSiteDiaryService(identity.accessToken).getSiteDiaryById(siteDiaryId);
    if (isSuccess(result)) {
      if (!result.value) return NextResponse.json({ error: 'Site diary record not found' }, { status: 404 });
      return NextResponse.json({ data: result.value }, { status: 200 });
    }
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to retrieve site diary' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteParams) {
  try {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) return NextResponse.json({ error: 'Unauthorized: Missing or invalid identity' }, { status: 401 });
    const { siteDiaryId } = await context.params;
    if (!siteDiaryId || typeof siteDiaryId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid route parameter: siteDiaryId' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid payload: Request body must be a valid JSON object' }, { status: 400 });
    }

    const parseResult = updateSiteDiarySchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ error: `Validation failed: ${errorMsg}` }, { status: 400 });
    }

    const result = await createSiteDiaryService(identity.accessToken).updateSiteDiary({
      siteDiaryId,
      expectedLastModifiedAt: parseResult.data.expected_last_modified_at,
      weather: parseResult.data.weather as any,
      notes: parseResult.data.notes,
      manpower: parseResult.data.manpower,
      printContext: parseResult.data.print_context as any,
      updatedBy: identity.actorId,
    });

    if (isSuccess(result)) {
      return NextResponse.json({
        data: {
          ...result.value,
          lastModifiedAt: result.value.updated_at ?? result.value.submitted_at,
        },
      }, { status: 200 });
    }
    return NextResponse.json({ error: result.error.message }, { status: result.error.httpStatus });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update site diary' }, { status: 500 });
  }
}

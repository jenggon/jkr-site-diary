import { NextResponse } from 'next/server';
import { createSiteDiaryService } from '@/composition/siteDiaryComposition';
import { extractIdentity } from '@/app/api/_shared/identity';
import { z } from 'zod';
import { isSuccess } from '@/lib/result';

type RouteParams = {
  params: Promise<{ siteDiaryId: string }>;
};

const updateSiteDiarySchema = z.object({
  weather: z.enum(['Sunny', 'Cloudy', 'Rainy', 'HeavyRain']).nullable().optional(),
  notes: z.string().optional(),
  manpower: z.array(z.object({
    trade_name: z.string(),
    bumi_count: z.number().int().min(0),
    non_bumi_count: z.number().int().min(0),
    foreign_count: z.number().int().min(0)
  })).nullable().optional()
});

/**
 * GET /api/site-diary/[siteDiaryId]
 * Retrieves a Site Diary record by ID.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const actorId = await extractIdentity(request);
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid identity' }, { status: 401 });
    }

    const { siteDiaryId } = await context.params;

    if (!siteDiaryId || typeof siteDiaryId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: siteDiaryId' },
        { status: 400 }
      );
    }

    const siteDiaryService = createSiteDiaryService();
    const result = await siteDiaryService.getSiteDiaryById(siteDiaryId);

    if (isSuccess(result)) {
      if (!result.value) {
        return NextResponse.json(
          { error: 'Site diary record not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ data: result.value }, { status: 200 });
    }

    return NextResponse.json({ error: result.error.message }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve site diary' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/site-diary/[siteDiaryId]
 * Updates an existing Site Diary record.
 */
export async function PATCH(request: Request, context: RouteParams) {
  try {
    const actorId = await extractIdentity(request);
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid identity' }, { status: 401 });
    }

    const { siteDiaryId } = await context.params;

    if (!siteDiaryId || typeof siteDiaryId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: siteDiaryId' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid payload: Request body must be a valid JSON object' },
        { status: 400 }
      );
    }

    const parseResult = updateSiteDiarySchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ error: `Validation failed: ${errorMsg}` }, { status: 400 });
    }

    const siteDiaryService = createSiteDiaryService();
    const result = await siteDiaryService.updateSiteDiary({
      siteDiaryId,
      weather: parseResult.data.weather as any,
      notes: parseResult.data.notes,
      manpower: parseResult.data.manpower,
      updatedBy: actorId
    });

    if (isSuccess(result)) {
      return NextResponse.json({ data: result.value }, { status: 200 });
    }

    return NextResponse.json({ error: result.error.message }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update site diary' },
      { status: 500 }
    );
  }
}

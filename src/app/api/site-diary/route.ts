import { NextResponse } from 'next/server';
import { createSiteDiaryService } from '@/composition/siteDiaryComposition';
import { extractIdentity } from '@/app/api/_shared/identity';
import { z } from 'zod';
import { isValidUuid } from '@/lib/uuid';
import { isValidIso8601 } from '@/lib/clock';
import { isSuccess } from '@/lib/result';

const createSiteDiarySchema = z.object({
  programme_id: z.string().refine(isValidUuid, 'Invalid UUID for programme_id'),
  revision_id: z.string().refine(isValidUuid, 'Invalid UUID for revision_id'),
  activity_id: z.string().refine(isValidUuid, 'Invalid UUID for activity_id'),
  activity_date: z.string().refine(isValidIso8601, 'Invalid ISO8601 format for activity_date'),
  notes: z.string().min(1, 'notes cannot be empty'),
});

/**
 * POST /api/site-diary
 * Creates a new Site Diary daily execution record.
 */
export async function POST(request: Request) {
  try {
    const actorId = extractIdentity(request);
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid identity' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid payload: Request body must be a valid JSON object' },
        { status: 400 }
      );
    }

    const parseResult = createSiteDiarySchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ error: `Validation failed: ${errorMsg}` }, { status: 400 });
    }

    const siteDiaryService = createSiteDiaryService();
    const result = await siteDiaryService.createSiteDiary({
      programmeId: parseResult.data.programme_id,
      revisionId: parseResult.data.revision_id,
      activityId: parseResult.data.activity_id,
      activityDate: parseResult.data.activity_date,
      notes: parseResult.data.notes,
      submittedBy: actorId,
    });

    if (isSuccess(result)) {
      return NextResponse.json({ data: result.value }, { status: 201 });
    }

    return NextResponse.json(
      { error: result.error.message },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create site diary' },
      { status: 500 }
    );
  }
}

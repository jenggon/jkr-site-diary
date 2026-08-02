import { NextResponse } from 'next/server';
import { siteDiaryService } from '@/services/siteDiaryService';

/**
 * POST /api/site-diary
 * Creates a new Site Diary daily execution record.
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

    const { programme_id, revision_id, activity_id, activity_date, notes, submitted_by } = body;

    if (!programme_id || typeof programme_id !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: programme_id' },
        { status: 400 }
      );
    }

    if (!revision_id || typeof revision_id !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: revision_id' },
        { status: 400 }
      );
    }

    if (!activity_id || typeof activity_id !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: activity_id' },
        { status: 400 }
      );
    }

    if (!activity_date || typeof activity_date !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: activity_date' },
        { status: 400 }
      );
    }

    if (!notes || typeof notes !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: notes' },
        { status: 400 }
      );
    }

    if (!submitted_by || typeof submitted_by !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: submitted_by' },
        { status: 400 }
      );
    }

    const siteDiary = await siteDiaryService.createSiteDiary(body);
    return NextResponse.json({ data: siteDiary }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create site diary' },
      { status: 500 }
    );
  }
}

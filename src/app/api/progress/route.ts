import { NextResponse } from 'next/server';
import { progressService } from '@/services/progressService';

/**
 * POST /api/progress
 * Creates a new Progress physical measurement record.
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

    const { programme_id, revision_id, activity_id, site_diary_id, measurement_date, actual_quantity } = body;

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

    if (!site_diary_id || typeof site_diary_id !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: site_diary_id' },
        { status: 400 }
      );
    }

    if (!measurement_date || typeof measurement_date !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: measurement_date' },
        { status: 400 }
      );
    }

    if (actual_quantity === undefined || typeof actual_quantity !== 'number') {
      return NextResponse.json(
        { error: 'Missing or invalid required field: actual_quantity (must be a number)' },
        { status: 400 }
      );
    }

    const progress = await progressService.createProgress(body);
    return NextResponse.json({ data: progress }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create progress record' },
      { status: 500 }
    );
  }
}

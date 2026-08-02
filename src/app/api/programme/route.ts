import { NextResponse } from 'next/server';
import { programmeService } from '@/services/programmeService';

/**
 * POST /api/programme
 * Creates a new Programme record.
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

    const { programme_code, programme_name, created_by } = body;

    if (!programme_code || typeof programme_code !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: programme_code' },
        { status: 400 }
      );
    }

    if (!programme_name || typeof programme_name !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: programme_name' },
        { status: 400 }
      );
    }

    if (!created_by || typeof created_by !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: created_by' },
        { status: 400 }
      );
    }

    const programme = await programmeService.createProgramme(body);
    return NextResponse.json({ data: programme }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create programme' },
      { status: 500 }
    );
  }
}

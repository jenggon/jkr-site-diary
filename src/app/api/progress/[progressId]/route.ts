import { NextResponse } from 'next/server';
import { progressService } from '@/services/progressService';

type RouteParams = {
  params: Promise<{ progressId: string }>;
};

/**
 * GET /api/progress/[progressId]
 * Retrieves a Progress record by ID.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { progressId } = await context.params;

    if (!progressId || typeof progressId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: progressId' },
        { status: 400 }
      );
    }

    const progress = await progressService.getProgressById(progressId);

    if (!progress) {
      return NextResponse.json(
        { error: 'Progress record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: progress }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve progress record' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/progress/[progressId]
 * Updates an existing Progress record.
 */
export async function PATCH(request: Request, context: RouteParams) {
  try {
    const { progressId } = await context.params;

    if (!progressId || typeof progressId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: progressId' },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid payload: Request body must be a valid JSON object' },
        { status: 400 }
      );
    }

    const updatedProgress = await progressService.updateProgress(progressId, body);

    return NextResponse.json({ data: updatedProgress }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update progress record' },
      { status: 500 }
    );
  }
}

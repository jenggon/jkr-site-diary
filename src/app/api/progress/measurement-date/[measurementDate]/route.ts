import { NextResponse } from 'next/server';
import { createProgressService } from '@/composition/progressComposition';
import { isFailure } from '@/lib/result';

type RouteParams = {
  params: Promise<{ measurementDate: string }>;
};

/**
 * GET /api/progress/measurement-date/[measurementDate]
 * Retrieves all Progress records for a specific Measurement Date.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { measurementDate } = await context.params;

    if (!measurementDate || typeof measurementDate !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: measurementDate' },
        { status: 400 }
      );
    }

    const progressService = createProgressService();
    const result = await progressService.getProgressByMeasurementDate(measurementDate);

    if (isFailure(result)) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ data: result.value }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve progress records' },
      { status: 500 }
    );
  }
}

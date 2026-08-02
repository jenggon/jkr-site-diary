import { NextResponse } from 'next/server';
import { progressService } from '@/services/progressService';

type RouteParams = {
  params: Promise<{ measurementDate: string }>;
};

/**
 * GET /api/progress/measurement-date/[measurementDate]
 * Retrieves Progress records filtered by measurement date.
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

    const progressRecords = await progressService.getProgressByMeasurementDate(measurementDate);

    return NextResponse.json({ data: progressRecords }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve progress records by measurement date' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { workforceService } from '@/services/workforceService';

type RouteParams = {
  params: Promise<{ workforceId: string }>;
};

/**
 * GET /api/workforce/[workforceId]
 * Retrieves a Workforce record by ID.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { workforceId } = await context.params;

    if (!workforceId || typeof workforceId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: workforceId' },
        { status: 400 }
      );
    }

    const workforce = await workforceService.getWorkforceById(workforceId);

    if (!workforce) {
      return NextResponse.json(
        { error: 'Workforce record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: workforce }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve workforce record' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/workforce/[workforceId]
 * Updates an existing Workforce record.
 */
export async function PATCH(request: Request, context: RouteParams) {
  try {
    const { workforceId } = await context.params;

    if (!workforceId || typeof workforceId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: workforceId' },
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

    const updatedWorkforce = await workforceService.updateWorkforce(workforceId, body);

    return NextResponse.json({ data: updatedWorkforce }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update workforce record' },
      { status: 500 }
    );
  }
}

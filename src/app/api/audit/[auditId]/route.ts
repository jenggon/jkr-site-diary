import { NextResponse } from 'next/server';
import { auditService } from '@/services/auditService';

type RouteParams = {
  params: Promise<{ auditId: string }>;
};

/**
 * GET /api/audit/[auditId]
 * Retrieves an Audit log record by ID.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { auditId } = await context.params;

    if (!auditId || typeof auditId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: auditId' },
        { status: 400 }
      );
    }

    const audit = await auditService.getAuditById(auditId);

    if (!audit) {
      return NextResponse.json(
        { error: 'Audit log record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: audit }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve audit log record' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/audit/[auditId]
 * Updates an existing Audit log record.
 */
export async function PATCH(request: Request, context: RouteParams) {
  try {
    const { auditId } = await context.params;

    if (!auditId || typeof auditId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: auditId' },
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

    const updatedAudit = await auditService.updateAudit(auditId, body);

    return NextResponse.json({ data: updatedAudit }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update audit log record' },
      { status: 500 }
    );
  }
}

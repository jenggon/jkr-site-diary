import { NextResponse } from 'next/server';
import { auditService } from '@/services/auditService';
import { AuditEventType } from '@/types/audit';

type RouteParams = {
  params: Promise<{ eventType: string }>;
};

/**
 * GET /api/audit/event/[eventType]
 * Retrieves all Audit log records filtered by event type.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { eventType } = await context.params;

    if (!eventType || typeof eventType !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: eventType' },
        { status: 400 }
      );
    }

    const auditLogs = await auditService.getAuditByEventType(eventType as AuditEventType);

    return NextResponse.json({ data: auditLogs }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve audit logs by event type' },
      { status: 500 }
    );
  }
}

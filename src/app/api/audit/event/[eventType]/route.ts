import { NextResponse } from 'next/server';
import { createAuditReadService } from '@/composition/auditReadComposition';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
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
    const identity = await extractVerifiedIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventType } = await context.params;

    if (!Object.values(AuditEventType).includes(eventType as AuditEventType)) {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: eventType' },
        { status: 400 }
      );
    }

    const auditLogs = await createAuditReadService(identity.accessToken).getAuditByEventType(eventType as AuditEventType);

    return NextResponse.json({ data: auditLogs }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

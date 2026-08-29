import { NextResponse } from 'next/server';
import { createAuditReadService } from '@/composition/auditReadComposition';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { isValidUuid } from '@/lib/uuid';

/**
 * GET /api/audit/entity?entityName=Activity&entityId=<uuid>
 * Retrieves Audit log records for a specific entity reference.
 */
export async function GET(request: Request) {
  try {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityName = searchParams.get('entityName');
    const entityId = searchParams.get('entityId');

    if (!entityName || typeof entityName !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid query parameter: entityName' },
        { status: 400 }
      );
    }

    if (!entityId || !isValidUuid(entityId)) {
      return NextResponse.json(
        { error: 'Missing or invalid query parameter: entityId' },
        { status: 400 }
      );
    }

    const auditLogs = await createAuditReadService(identity.accessToken).getAuditByEntity(entityName, entityId);

    return NextResponse.json({ data: auditLogs }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { auditService } from '@/services/auditService';

/**
 * GET /api/audit/entity?entityName=Activity&entityId=<uuid>
 * Retrieves Audit log records for a specific entity reference.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entityName = searchParams.get('entityName');
    const entityId = searchParams.get('entityId');

    if (!entityName || typeof entityName !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid query parameter: entityName' },
        { status: 400 }
      );
    }

    if (!entityId || typeof entityId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid query parameter: entityId' },
        { status: 400 }
      );
    }

    const auditLogs = await auditService.getAuditByEntity(entityName, entityId);

    return NextResponse.json({ data: auditLogs }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve audit logs by entity' },
      { status: 500 }
    );
  }
}

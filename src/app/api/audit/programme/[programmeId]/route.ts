import { NextResponse } from 'next/server';
import { auditService } from '@/services/auditService';

type RouteParams = {
  params: Promise<{ programmeId: string }>;
};

/**
 * GET /api/audit/programme/[programmeId]
 * Retrieves all Audit log records belonging to a Programme.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { programmeId } = await context.params;

    if (!programmeId || typeof programmeId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: programmeId' },
        { status: 400 }
      );
    }

    const auditLogs = await auditService.getAuditByProgramme(programmeId);

    return NextResponse.json({ data: auditLogs }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve audit logs by programme' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { auditService } from '@/services/auditService';

type RouteParams = {
  params: Promise<{ userId: string }>;
};

/**
 * GET /api/audit/user/[userId]
 * Retrieves all Audit log records performed by a user.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { userId } = await context.params;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: userId' },
        { status: 400 }
      );
    }

    const auditLogs = await auditService.getAuditByUser(userId);

    return NextResponse.json({ data: auditLogs }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve audit logs by user' },
      { status: 500 }
    );
  }
}

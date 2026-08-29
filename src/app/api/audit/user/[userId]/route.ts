import { NextResponse } from 'next/server';
import { createAuditReadService } from '@/composition/auditReadComposition';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { isValidUuid } from '@/lib/uuid';

type RouteParams = {
  params: Promise<{ userId: string }>;
};

/**
 * GET /api/audit/user/[userId]
 * Retrieves all Audit log records performed by a user.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await context.params;

    if (!isValidUuid(userId)) {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: userId' },
        { status: 400 }
      );
    }

    const auditLogs = await createAuditReadService(identity.accessToken).getAuditByUser(userId);

    return NextResponse.json({ data: auditLogs }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

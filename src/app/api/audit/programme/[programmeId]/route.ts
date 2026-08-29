import { NextResponse } from 'next/server';
import { createAuditReadService } from '@/composition/auditReadComposition';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { isValidUuid } from '@/lib/uuid';

type RouteParams = {
  params: Promise<{ programmeId: string }>;
};

/**
 * GET /api/audit/programme/[programmeId]
 * Retrieves all Audit log records belonging to a Programme.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { programmeId } = await context.params;

    if (!isValidUuid(programmeId)) {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: programmeId' },
        { status: 400 }
      );
    }

    const auditLogs = await createAuditReadService(identity.accessToken).getAuditByProgramme(programmeId);

    return NextResponse.json({ data: auditLogs }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

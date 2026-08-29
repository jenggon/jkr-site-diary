import { NextResponse } from 'next/server';
import { createAuditReadService } from '@/composition/auditReadComposition';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { isValidUuid } from '@/lib/uuid';

type RouteParams = {
  params: Promise<{ auditId: string }>;
};

/**
 * GET /api/audit/[auditId]
 * Retrieves an Audit log record by ID.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { auditId } = await context.params;

    if (!isValidUuid(auditId)) {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: auditId' },
        { status: 400 }
      );
    }

    const audit = await createAuditReadService(identity.accessToken).getAuditById(auditId);

    if (!audit) {
      return NextResponse.json(
        { error: 'Audit log record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: audit }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/audit/[auditId]
 * Updates an existing Audit log record.
 */
export async function PATCH(request: Request, context: RouteParams) {
  void request;
  void context;
  return NextResponse.json({ error: 'Audit evidence is append-only' }, { status: 405 });
}

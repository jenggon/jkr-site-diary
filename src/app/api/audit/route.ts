import { NextResponse } from 'next/server';
import { auditService } from '@/services/auditService';

/**
 * POST /api/audit
 * Creates a new Audit log record.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid payload: Request body must be a valid JSON object' },
        { status: 400 }
      );
    }

    const { programme_id, entity_name, entity_id, event_type, performed_by } = body;

    if (!programme_id || typeof programme_id !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: programme_id' },
        { status: 400 }
      );
    }

    if (!entity_name || typeof entity_name !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: entity_name' },
        { status: 400 }
      );
    }

    if (!entity_id || typeof entity_id !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: entity_id' },
        { status: 400 }
      );
    }

    if (!event_type || typeof event_type !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: event_type' },
        { status: 400 }
      );
    }

    if (!performed_by || typeof performed_by !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: performed_by' },
        { status: 400 }
      );
    }

    const audit = await auditService.createAudit(body);
    return NextResponse.json({ data: audit }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create audit log' },
      { status: 500 }
    );
  }
}

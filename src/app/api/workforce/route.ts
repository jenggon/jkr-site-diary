import { NextResponse } from 'next/server';
import { createWorkforceService } from '@/composition/workforceComposition';
import { isFailure } from '@/lib/result';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';

/**
 * POST /api/workforce
 * Creates a new Workforce manpower record.
 */
export async function POST(request: Request) {
  try {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid payload: Request body must be a valid JSON object' },
        { status: 400 }
      );
    }

    const { programme_id, revision_id, activity_id, site_diary_id, trade_id } = body;

    if (!programme_id || typeof programme_id !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: programme_id' },
        { status: 400 }
      );
    }

    if (!revision_id || typeof revision_id !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: revision_id' },
        { status: 400 }
      );
    }

    if (!activity_id || typeof activity_id !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: activity_id' },
        { status: 400 }
      );
    }

    if (!site_diary_id || typeof site_diary_id !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: site_diary_id' },
        { status: 400 }
      );
    }

    if (!trade_id || typeof trade_id !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: trade_id' },
        { status: 400 }
      );
    }

    const result = await createWorkforceService(identity.accessToken).createWorkforce({ ...body, actor_id: identity.actorId });

    if (isFailure(result)) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(result.value, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create workforce record' },
      { status: 500 }
    );
  }
}

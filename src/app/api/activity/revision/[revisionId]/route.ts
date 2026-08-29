import { NextResponse } from 'next/server';
import { ActivityRepository } from '@/repositories/activityRepository';
import { SupabaseDatabaseAdapter } from '@/repositories/adapters/SupabaseDatabaseAdapter';
import { getSupabaseAuthenticatedClient } from '@/lib/supabase';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { isFailure } from '@/lib/result';
import { isValidUuid } from '@/lib/uuid';

type RouteParams = {
  params: Promise<{ revisionId: string }>;
};

/**
 * GET /api/activity/revision/[revisionId]
 * Retrieves all Activities belonging to a Programme Revision.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid identity' }, { status: 401 });
    }

    const { revisionId } = await context.params;

    if (!isValidUuid(revisionId)) {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: revisionId' },
        { status: 400 }
      );
    }

    const client = getSupabaseAuthenticatedClient(identity.accessToken);
    const repo = new ActivityRepository(new SupabaseDatabaseAdapter(client));
    const result = await repo.findByRevisionId(revisionId);

    if (isFailure(result)) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ data: result.value }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

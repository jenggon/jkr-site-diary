import { NextResponse } from 'next/server';
import { ActivityRepository } from '@/repositories/ActivityRepository';
import { SupabaseDatabaseAdapter } from '@/repositories/adapters/SupabaseDatabaseAdapter';
import { supabase } from '@/lib/supabase';
import { extractIdentity } from '@/app/api/_shared/identity';
import { isFailure } from '@/lib/result';

type RouteParams = {
  params: Promise<{ revisionId: string }>;
};

/**
 * GET /api/activity/revision/[revisionId]
 * Retrieves all Activities belonging to a Programme Revision.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const actorId = extractIdentity(request);
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid identity' }, { status: 401 });
    }

    const { revisionId } = await context.params;

    if (!revisionId || typeof revisionId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: revisionId' },
        { status: 400 }
      );
    }

    const repo = new ActivityRepository(new SupabaseDatabaseAdapter(supabase));
    const result = await repo.findByRevisionId(revisionId);

    if (isFailure(result)) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ data: result.value }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve activities by revision' },
      { status: 500 }
    );
  }
}

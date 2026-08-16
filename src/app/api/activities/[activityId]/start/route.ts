import { NextResponse } from 'next/server';
import { handleRoute } from '@/app/api/_shared/handleRoute';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { createOpenActivityService } from '@/composition/activityComposition';
import { getSupabaseAuthenticatedClient } from '@/lib/supabase';
import { toSuccessResponse, toErrorResponse } from '@/app/api/_shared/response';
import { mapActivityToResponseDto } from '@/app/api/_shared/activity.mapper';
import { isSuccess } from '@/lib/result';

const isDateOnly = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

export async function POST(
  request: Request,
  context: { params: Promise<{ activityId: string }> }
) {
  return handleRoute(request, async () => {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { activityId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const actualStartDate = body?.actualStartDate;

    if (actualStartDate !== undefined) {
      if (!isDateOnly(actualStartDate)) {
        return NextResponse.json(
          { error: 'Validation failed: actualStartDate must use YYYY-MM-DD' },
          { status: 400 }
        );
      }

      const client = getSupabaseAuthenticatedClient(identity.accessToken);
      const { data, error } = await client.rpc('f1_start_activity_on_date_atomic', {
        p_activity_id: activityId,
        p_actual_start_date: actualStartDate,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ data }, { status: 200 });
    }

    const service = createOpenActivityService(identity.accessToken);
    const result = await service.startActivity(activityId, identity.actorId);

    if (isSuccess(result)) {
      return toSuccessResponse(mapActivityToResponseDto(result.value));
    }
    return toErrorResponse(result.error);
  });
}

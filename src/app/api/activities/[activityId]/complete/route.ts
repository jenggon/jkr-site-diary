import { NextResponse } from 'next/server';
import { handleRoute } from '@/app/api/_shared/handleRoute';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { createOpenActivityService } from '@/composition/activityComposition';
import { toSuccessResponse, toErrorResponse } from '@/app/api/_shared/response';
import { mapActivityToResponseDto } from '@/app/api/_shared/activity.mapper';
import { isSuccess } from '@/lib/result';

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

    const service = createOpenActivityService(identity.accessToken);
    const result = await service.completeActivity(activityId, identity.actorId);

    if (isSuccess(result)) {
      return toSuccessResponse(mapActivityToResponseDto(result.value));
    }
    return toErrorResponse(result.error);
  });
}

import { NextResponse } from 'next/server';
import { handleRoute } from '@/app/api/_shared/handleRoute';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { toSuccessResponse, toErrorResponse } from '@/app/api/_shared/response';
import { mapActivityLogToResponseDto } from '@/app/api/_shared/activity.mapper';
import { isSuccess } from '@/lib/result';
import { createOpenActivityService } from '@/composition/activityComposition';
import { isValidUuid } from '@/lib/uuid';

export async function GET(
  request: Request,
  context: { params: Promise<{ activityId: string }> }
) {
  return handleRoute(request, async () => {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { activityId } = await context.params;
    if (!isValidUuid(activityId)) {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: activityId' },
        { status: 400 }
      );
    }

    const service = createOpenActivityService(identity.accessToken);
    const result = await service.getActivityHistory(activityId);

    if (isSuccess(result)) {
      const dtos = result.value.map(mapActivityLogToResponseDto);
      return toSuccessResponse(dtos);
    }
    return toErrorResponse(result.error);
  });
}

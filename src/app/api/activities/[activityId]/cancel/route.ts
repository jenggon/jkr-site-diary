import { handleRoute } from '@/app/api/_shared/handleRoute';
import { toSuccessResponse, toErrorResponse } from '@/app/api/_shared/response';
import { mapActivityToResponseDto } from '@/app/api/_shared/activity.mapper';
import { CancelActivityRequestDto } from '@/app/api/_shared/activity.dto';
import { isSuccess } from '@/lib/result';

export async function POST(
  request: Request,
  context: { params: Promise<{ activityId: string }> }
) {
  return handleRoute(request, async ({ services }) => {
    const { activityId } = await context.params;
    const body: CancelActivityRequestDto = await request.json();

    const service = services.openActivity();
    const result = await service.cancelActivity(activityId, body.reason, body.cancelled_by);

    if (isSuccess(result)) {
      return toSuccessResponse(mapActivityToResponseDto(result.value));
    }
    return toErrorResponse(result.error);
  });
}

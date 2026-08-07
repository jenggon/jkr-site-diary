import { handleRoute } from '@/app/api/_shared/handleRoute';
import { toSuccessResponse, toErrorResponse } from '@/app/api/_shared/response';
import { mapActivityLogToResponseDto } from '@/app/api/_shared/activity.mapper';
import { isSuccess } from '@/lib/result';

export async function GET(
  request: Request,
  context: { params: Promise<{ activityId: string }> }
) {
  return handleRoute(request, async ({ services }) => {
    const { activityId } = await context.params;
    const service = services.openActivity();
    const result = await service.getActivityHistory(activityId);

    if (isSuccess(result)) {
      const dtos = result.value.map(mapActivityLogToResponseDto);
      return toSuccessResponse(dtos);
    }
    return toErrorResponse(result.error);
  });
}

import { handleRoute } from '@/app/api/_shared/handleRoute';
import { toSuccessResponse, toErrorResponse } from '@/app/api/_shared/response';
import { mapActivityToResponseDto } from '@/app/api/_shared/activity.mapper';
import { UpdateActivityRequestDto } from '@/app/api/_shared/activity.dto';
import { isSuccess } from '@/lib/result';
import { ActivityNotFoundError } from '@/errors/activityErrors';

export async function GET(
  request: Request,
  context: { params: Promise<{ activityId: string }> }
) {
  return handleRoute(request, async ({ services }) => {
    const { activityId } = await context.params;
    const service = services.openActivity();

    // Find activities across site diary or by id using service
    // Note: getActivitiesForDiary returns array; to get single by ID, we call service.getActivitiesForDiary or search
    // Or we fetch diary history / find by ID via service.
    // Let's call getActivitiesForDiary or service update lookup.
    // Since IOpenActivityService doesn't expose findById directly (only repository does),
    // let's check how OpenActivityService handles single activity or update.
    // In OpenActivityService, updateActivity takes activityId.
    // For GET activity by ID, we get activities from diary or history.
    // Wait, let's verify if we need to query getActivitiesForDiary or if we check activity by ID.
    // Let's use service.getActivityHistory(activityId) to confirm existence and get current state if needed,
    // or let's check getActivitiesForDiary if siteDiaryId is unknown.
    // Actually, getActivityHistory(activityId) returns log entries from which we can extract latest snapshot or we can check getActivitiesForDiary.
    // Let's inspect how getActivityHistory returns:
    const historyRes = await service.getActivityHistory(activityId);
    if (isSuccess(historyRes)) {
      if (historyRes.value.length === 0) {
        return toErrorResponse(new ActivityNotFoundError(`Activity with ID ${activityId} not found`));
      }
      const latestLog = historyRes.value[historyRes.value.length - 1]!;
      const snapshot = latestLog.snapshotData as unknown as import('@/types/openActivity').OpenActivity;
      return toSuccessResponse(mapActivityToResponseDto(snapshot));
    }
    return toErrorResponse(historyRes.error);
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ activityId: string }> }
) {
  return handleRoute(request, async ({ services }) => {
    const { activityId } = await context.params;
    const body: UpdateActivityRequestDto = await request.json();

    const service = services.openActivity();
    const result = await service.updateActivity({
      activityId,
      activityName: body.activity_name,
      location: body.location
        ? {
            buildingId: body.location.building_id,
            floorLevel: body.location.floor_level,
            zone: body.location.zone,
            gridReference: body.location.grid_reference,
          }
        : undefined,
      tradeSelection: body.trade_info
        ? {
            tradeId: body.trade_info.trade_id,
            tradeCode: body.trade_info.trade_code,
            tradeName: body.trade_info.trade_name,
            source: body.trade_info.source,
          }
        : undefined,
      workforceCount: body.workforce_count,
      updatedBy: body.updated_by,
    });

    if (isSuccess(result)) {
      return toSuccessResponse(mapActivityToResponseDto(result.value));
    }
    return toErrorResponse(result.error);
  });
}

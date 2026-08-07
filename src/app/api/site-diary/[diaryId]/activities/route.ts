import { handleRoute } from '@/app/api/_shared/handleRoute';
import { toSuccessResponse, createdResponse, toErrorResponse } from '@/app/api/_shared/response';
import { mapActivityToResponseDto } from '@/app/api/_shared/activity.mapper';
import { CreateActivityRequestDto } from '@/app/api/_shared/activity.dto';
import { isSuccess } from '@/lib/result';

export async function GET(
  request: Request,
  context: { params: Promise<{ diaryId: string }> }
) {
  return handleRoute(request, async ({ services }) => {
    const { diaryId } = await context.params;
    const service = services.openActivity();
    const result = await service.getActivitiesForDiary(diaryId);

    if (isSuccess(result)) {
      const dtos = result.value.map(mapActivityToResponseDto);
      return toSuccessResponse(dtos);
    }
    return toErrorResponse(result.error);
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ diaryId: string }> }
) {
  return handleRoute(request, async ({ services }) => {
    const { diaryId } = await context.params;
    const body: CreateActivityRequestDto = await request.json();

    const service = services.openActivity();
    const result = await service.createActivity({
      siteDiaryId: diaryId,
      programmeId: body.programme_id,
      taskId: body.task_id,
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
      createdBy: body.created_by,
    });

    if (isSuccess(result)) {
      return createdResponse(mapActivityToResponseDto(result.value));
    }
    return toErrorResponse(result.error);
  });
}

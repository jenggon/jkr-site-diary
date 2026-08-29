import { NextResponse } from 'next/server';
import { handleRoute } from '@/app/api/_shared/handleRoute';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { createOpenActivityService } from '@/composition/activityComposition';
import { toSuccessResponse, toErrorResponse } from '@/app/api/_shared/response';
import { mapActivityToResponseDto } from '@/app/api/_shared/activity.mapper';
import { UpdateActivityRequestDto } from '@/app/api/_shared/activity.dto';
import { isSuccess } from '@/lib/result';
import { ActivityNotFoundError } from '@/errors/activityErrors';
import { Activity, ActivitySourceType } from '@/types/activity';
import { OpenActivityDto } from '@/types/openActivity';

export async function GET(
  request: Request,
  context: { params: Promise<{ activityId: string }> }
) {
  return handleRoute(request, async ({ services }) => {
    const { activityId } = await context.params;
    const service = services.openActivity();

    const historyRes = await service.getActivityHistory(activityId);
    if (isSuccess(historyRes)) {
      if (historyRes.value.length === 0) {
        return toErrorResponse(new ActivityNotFoundError(`Activity with ID ${activityId} not found`));
      }
      const latestLog = historyRes.value[historyRes.value.length - 1]!;
      const act = latestLog.snapshotData as unknown as Activity;

      const dto: OpenActivityDto = {
        activityId: act.activity_id,
        programmeId: act.programme_id,
        revisionId: act.revision_id,
        sourceType: act.source_type ?? ActivitySourceType.MSP,
        taskId: act.task_id ?? undefined,
        voItemId: act.vo_item_id ?? undefined,
        ahi: act.ahi ?? null,
        ahiDisplayName: act.ahi_display_name ?? null,
        subtask: act.subtask,
        subtaskDisplayName: act.subtask_display_name ?? null,
        status: act.status,
        isLocked: false,
        createdAt: act.created_at,
        createdBy: act.submitted_by,
        updatedAt: act.updated_at ?? undefined,
        updatedBy: act.updated_at ? act.submitted_by : undefined,
      };

      return toSuccessResponse(mapActivityToResponseDto(dto));
    }
    return toErrorResponse(historyRes.error);
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ activityId: string }> }
) {
  return handleRoute(request, async () => {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { activityId } = await context.params;
    const body: UpdateActivityRequestDto = await request.json();

    const service = createOpenActivityService(identity.accessToken);
    const result = await service.updateActivity({
      activityId,
      activityName: body.subtask,
      updatedBy: identity.actorId,
    });

    if (isSuccess(result)) {
      return toSuccessResponse(mapActivityToResponseDto(result.value));
    }
    return toErrorResponse(result.error);
  });
}

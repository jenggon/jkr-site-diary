import { NextResponse } from 'next/server';
import { handleRoute } from '@/app/api/_shared/handleRoute';
import { extractIdentity } from '@/app/api/_shared/identity';
import { toSuccessResponse, toErrorResponse } from '@/app/api/_shared/response';
import { mapActivityToResponseDto } from '@/app/api/_shared/activity.mapper';
import { UpdateActivityRequestDto } from '@/app/api/_shared/activity.dto';
import { isSuccess } from '@/lib/result';
import { ActivityNotFoundError } from '@/errors/activityErrors';
import { Activity } from '@/types/activity';
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
        taskId: act.task_id,
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
  return handleRoute(request, async ({ services }) => {
    const actorId = await extractIdentity(request);
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { activityId } = await context.params;
    const body: UpdateActivityRequestDto = await request.json();

    const service = services.openActivity();
    const result = await service.updateActivity({
      activityId,
      activityName: body.subtask, // Mapped to subtask internally
      updatedBy: actorId,
    });

    if (isSuccess(result)) {
      return toSuccessResponse(mapActivityToResponseDto(result.value));
    }
    return toErrorResponse(result.error);
  });
}

import { handleRoute } from '@/app/api/_shared/handleRoute';
import { toSuccessResponse, createdResponse, toErrorResponse } from '@/app/api/_shared/response';
import { mapActivityToResponseDto } from '@/app/api/_shared/activity.mapper';
import { CreateActivityRequestDto } from '@/app/api/_shared/activity.dto';
import { isSuccess } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';

export async function GET(
  request: Request,
  context: { params: Promise<{ diaryId: string }> }
) {
  return handleRoute(request, async () => {
    // DB-003 ARCHITECTURE CHANGE
    // Activities no longer belong to Site Diaries. Site Diary is a child of Activity.
    // Querying activities by diaryId is obsolete and removed.
    // Frontend must query activities by Revision or Task.
    return Response.json(
      { error: 'Obsolete API. Query Activities by Revision or Task.' },
      { status: 410 }
    );
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
      siteDiaryId: diaryId, // Passed for context but ignored in DB-014
      programmeId: body.programme_id,
      revisionId: body.revision_id,
      taskId: body.task_id,
      activityName: body.subtask,
      createdBy: body.created_by,
    });

    if (isSuccess(result)) {
      return createdResponse(mapActivityToResponseDto(result.value));
    }
    return toErrorResponse(result.error);
  });
}

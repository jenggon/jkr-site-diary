import { NextResponse } from 'next/server';
import { handleRoute } from '@/app/api/_shared/handleRoute';
import { extractIdentity } from '@/app/api/_shared/identity';
import { createdResponse, toErrorResponse } from '@/app/api/_shared/response';
import { mapActivityToResponseDto } from '@/app/api/_shared/activity.mapper';
import { CreateActivityRequestDto } from '@/app/api/_shared/activity.dto';
import { isSuccess } from '@/lib/result';


export async function GET(
  request: Request,
  _context: { params: Promise<{ diaryId: string }> }
) {
  return handleRoute(request, async () => {
    // DB-003 ARCHITECTURE CHANGE
    // Activities no longer belong to Site Diaries. Site Diary is a child of Activity.
    // Querying activities by diaryId is obsolete and removed.
    // Frontend must query activities by Revision or Task.
    return NextResponse.json(
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
    const actorId = await extractIdentity(request);
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { diaryId } = await context.params;
    const body: CreateActivityRequestDto = await request.json();

    const service = services.openActivity();
    const result = await service.createActivity({
      siteDiaryId: diaryId, // Passed for context but ignored in DB-014
      programmeId: body.programme_id,
      revisionId: body.revision_id,
      taskId: body.task_id ?? '',
      activityName: body.subtask,
      createdBy: actorId,
    });

    if (isSuccess(result)) {
      return createdResponse(mapActivityToResponseDto(result.value));
    }
    return toErrorResponse(result.error);
  });
}

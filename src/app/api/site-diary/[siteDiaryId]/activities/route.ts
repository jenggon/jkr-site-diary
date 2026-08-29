import { NextResponse } from 'next/server';
import { handleRoute } from '@/app/api/_shared/handleRoute';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { createOpenActivityService } from '@/composition/activityComposition';
import { createdResponse, toErrorResponse } from '@/app/api/_shared/response';
import { mapActivityToResponseDto } from '@/app/api/_shared/activity.mapper';
import { CreateActivityRequestDto } from '@/app/api/_shared/activity.dto';
import { isSuccess } from '@/lib/result';

type RouteParams = {
  params: Promise<{ siteDiaryId: string }>;
};

export async function GET(request: Request, _context: RouteParams) {
  return handleRoute(request, async () => {
    // DB-003 ARCHITECTURE CHANGE
    // Activities no longer belong to Site Diaries. Site Diary is a child of Activity.
    // Querying activities by siteDiaryId is obsolete and removed.
    // Frontend must query activities by Revision or Task.
    return NextResponse.json(
      { error: 'Obsolete API. Query Activities by Revision or Task.' },
      { status: 410 }
    );
  });
}

export async function POST(request: Request, context: RouteParams) {
  return handleRoute(request, async () => {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { siteDiaryId } = await context.params;
    const body: CreateActivityRequestDto = await request.json();

    const service = createOpenActivityService(identity.accessToken);
    const result = await service.createActivity({
      siteDiaryId, // Passed for context but ignored in DB-014
      programmeId: body.programme_id,
      revisionId: body.revision_id,
      taskId: body.task_id ?? '',
      activityName: body.subtask,
      createdBy: identity.actorId,
    });

    if (isSuccess(result)) {
      return createdResponse(mapActivityToResponseDto(result.value));
    }
    return toErrorResponse(result.error);
  });
}

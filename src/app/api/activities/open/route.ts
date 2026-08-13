import { NextResponse } from 'next/server';
import { createOpenActivityService } from '@/composition/activityComposition';
import { extractIdentity } from '@/app/api/_shared/identity';
import { isFailure } from '@/lib/result';
import { mapErrorToHttpStatus } from '@/app/api/_shared/httpErrorMapper';

export async function GET(request: Request) {
  try {
    const actorId = await extractIdentity(request);
    if (!actorId) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid identity' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const programmeId = searchParams.get('programmeId');

    if (!programmeId || programmeId.trim() === '') {
      return NextResponse.json(
        { error: 'Validation failed: programmeId is required' },
        { status: 400 }
      );
    }

    const openActivityService = createOpenActivityService();
    const result = await openActivityService.getOpenActivities(programmeId);

    if (isFailure(result)) {
      return NextResponse.json(
        { error: result.error.message },
        { status: mapErrorToHttpStatus(result.error) }
      );
    }

    return NextResponse.json({ data: result.value }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch open activities' },
      { status: 500 }
    );
  }
}

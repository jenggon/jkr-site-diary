import { NextResponse } from 'next/server';
import { createOpenActivityService } from '@/composition/activityComposition';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { isFailure } from '@/lib/result';
import { mapErrorToHttpStatus } from '@/app/api/_shared/httpErrorMapper';

export async function GET(request: Request) {
  try {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid identity' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const programmeId = searchParams.get('programmeId');

    if (!programmeId || programmeId.trim() === '') {
      return NextResponse.json(
        { error: 'Validation failed: programmeId is required' },
        { status: 400 },
      );
    }

    const openActivityService = createOpenActivityService(identity.accessToken);
    const result = await openActivityService.getOpenActivities(programmeId);

    if (isFailure(result)) {
      return NextResponse.json(
        { error: 'Failed to fetch open activities' },
        { status: mapErrorToHttpStatus(result.error) },
      );
    }

    return NextResponse.json({ data: result.value }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch open activities' }, { status: 500 });
  }
}

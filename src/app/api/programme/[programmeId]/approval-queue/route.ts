import { NextResponse } from 'next/server';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { createApprovalQueueRepository } from '@/composition/approvalComposition';

type RouteParams = {
  params: Promise<{ programmeId: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid identity' }, { status: 401 });
    }

    const { programmeId } = await context.params;
    if (!programmeId || typeof programmeId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: programmeId' },
        { status: 400 }
      );
    }

    const repo = createApprovalQueueRepository(identity.accessToken);
    const data = await repo.getQueue(programmeId);

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    if (error.message === 'F24_UNAUTHORIZED_CAPABILITY') {
      return NextResponse.json({ error: 'F24_UNAUTHORIZED_CAPABILITY' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve approval queue' },
      { status: 500 }
    );
  }
}

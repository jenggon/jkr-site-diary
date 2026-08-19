import { NextResponse } from 'next/server';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { createApprovalReviewRepository } from '@/composition/approvalComposition';
import { ApprovalReviewReadError } from '@/repositories/ApprovalReviewReadRepository';

type RouteParams = {
  params: Promise<{ approvalId: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { approvalId } = await context.params;
    if (!approvalId || typeof approvalId !== 'string') {
      return NextResponse.json({ error: 'Invalid approval identifier' }, { status: 400 });
    }

    const data = await createApprovalReviewRepository(identity.accessToken).getExact(approvalId);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof ApprovalReviewReadError) {
      const message = error.status === 403
        ? 'Forbidden'
        : error.status === 404
          ? 'Approval review not found'
          : 'Failed to retrieve approval review';
      return NextResponse.json({ error: message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to retrieve approval review' }, { status: 500 });
  }
}

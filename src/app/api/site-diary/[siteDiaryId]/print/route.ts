import { NextResponse } from 'next/server';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { isValidUuid } from '@/lib/uuid';
import { createSiteDiaryPrintReadRepository } from '@/composition/siteDiaryPrintComposition';
import { SiteDiaryPrintReadError } from '@/repositories/SiteDiaryPrintReadRepository';

type RouteParams = {
  params: Promise<{ siteDiaryId: string }>;
};

/**
 * GET /api/site-diary/[siteDiaryId]/print
 * Retrieves exact Site Diary data required for JKR Print Experience.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid identity' }, { status: 401 });
    }

    const { siteDiaryId } = await context.params;
    if (!isValidUuid(siteDiaryId)) {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: siteDiaryId' },
        { status: 400 }
      );
    }

    const repository = createSiteDiaryPrintReadRepository(identity.accessToken);
    const data = await repository.getExact(siteDiaryId, identity.actorId);

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof SiteDiaryPrintReadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    // Do not return raw infrastructure/database error messages in HTTP 500
    console.error('Unhandled Site Diary Print Error:', error);
    return NextResponse.json({ error: 'Internal server error occurred while retrieving print data' }, { status: 500 });
  }
}

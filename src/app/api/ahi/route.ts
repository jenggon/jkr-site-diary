import { NextResponse } from 'next/server';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { createA26QueryService } from '@/composition/a26QueryComposition';

export async function GET(request: Request) {
  const identity = await extractVerifiedIdentity(request);
  if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const programmeId = new URL(request.url).searchParams.get('programmeId') ?? undefined;
  try {
    return NextResponse.json(await createA26QueryService(identity.accessToken).getAhi(programmeId));
  } catch (error) {
    const notFound =
      error instanceof Error &&
      error.message.startsWith('Programme or current revision not found:');
    return NextResponse.json(
      { error: notFound ? 'Programme not found' : 'Failed to load AHI' },
      { status: notFound ? 404 : 500 },
    );
  }
}

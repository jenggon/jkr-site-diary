import { NextResponse } from 'next/server';
import { a26QueryService } from '@/services/A26QueryService';

export async function GET(request: Request) {
  const programmeId = new URL(request.url).searchParams.get('programmeId') ?? undefined;
  try { return NextResponse.json(await a26QueryService.getAhi(programmeId)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load AHI' }, { status: 500 }); }
}

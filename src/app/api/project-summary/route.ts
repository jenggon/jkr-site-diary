import { NextRequest, NextResponse } from 'next/server';
import { a26QueryService } from '@/services/A26QueryService';

export async function GET(request: NextRequest) {
  const programmeId = request.nextUrl.searchParams.get('programmeId') ?? undefined;
  try { return NextResponse.json(await a26QueryService.getProjectSummary(programmeId)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load project summary' }, { status: 500 }); }
}

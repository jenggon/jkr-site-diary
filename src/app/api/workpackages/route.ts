import { NextRequest, NextResponse } from 'next/server';
import { a26QueryService } from '@/services/A26QueryService';

export async function GET(request: NextRequest) {
  const building = request.nextUrl.searchParams.get('building');
  if (!building) return NextResponse.json({ error: 'building parameter required' }, { status: 400 });
  const programmeId = request.nextUrl.searchParams.get('programmeId') ?? undefined;
  try { return NextResponse.json(await a26QueryService.getWorkpackages(building, programmeId)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load workpackages' }, { status: 500 }); }
}

import { NextRequest, NextResponse } from 'next/server';
import { a26QueryService } from '@/services/A26QueryService';

export async function GET(request: NextRequest) {
  const activityDate = request.nextUrl.searchParams.get('date') ?? new Date().toISOString().split('T')[0] ?? '';
  try { return NextResponse.json(await a26QueryService.getReports(activityDate)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load reports' }, { status: 500 }); }
}

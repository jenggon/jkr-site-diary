import { NextResponse } from 'next/server';

/**
 * GET /api/progress/measurement-date/[measurementDate]
 * Dormant Progress HTTP route (F2 fail-closed).
 */
export async function GET() {
  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}

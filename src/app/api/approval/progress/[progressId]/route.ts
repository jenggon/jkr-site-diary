import { NextResponse } from 'next/server';

/**
 * GET /api/approval/progress/[progressId]
 * Dormant Progress Approval HTTP route (F2 fail-closed).
 */
export async function GET() {
  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}

import { NextResponse } from 'next/server';

/**
 * GET /api/progress/[progressId]
 * Dormant Progress HTTP route (F2 fail-closed).
 */
export async function GET() {
  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}

/**
 * PATCH /api/progress/[progressId]
 * Dormant Progress HTTP route (F2 fail-closed).
 */
export async function PATCH() {
  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}

import { NextResponse } from 'next/server';

/**
 * POST /api/progress
 * Dormant Progress HTTP route (F2 fail-closed).
 */
export async function POST() {
  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}

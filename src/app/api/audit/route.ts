import { NextResponse } from 'next/server';

/**
 * POST /api/audit
 * Creates a new Audit log record.
 */
export async function POST(request: Request) {
  void request;
  return NextResponse.json({ error: 'Audit evidence is created by canonical domain operations only' }, { status: 405 });
}

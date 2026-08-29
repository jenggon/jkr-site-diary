import { NextResponse } from 'next/server';
import { tradeLibraryService } from '@/services/tradeLibraryService';

/**
 * GET /api/trade-library/active
 * Retrieves all active Trade entries from Trade Library for UI selection.
 */
export async function GET() {
  try {
    const activeTrades = await tradeLibraryService.getAllActiveTrades();

    return NextResponse.json({ data: activeTrades }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

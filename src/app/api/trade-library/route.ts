import { NextResponse } from 'next/server';
import { tradeLibraryService } from '@/services/tradeLibraryService';

/**
 * POST /api/trade-library
 * Creates a new Trade reference entry in Trade Library.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid payload: Request body must be a valid JSON object' },
        { status: 400 }
      );
    }

    const { trade_code, trade_name, created_by } = body;

    if (!trade_code || typeof trade_code !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: trade_code' },
        { status: 400 }
      );
    }

    if (!trade_name || typeof trade_name !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: trade_name' },
        { status: 400 }
      );
    }

    if (!created_by || typeof created_by !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: created_by' },
        { status: 400 }
      );
    }

    const trade = await tradeLibraryService.createTrade(body);
    return NextResponse.json({ data: trade }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create trade entry' },
      { status: 500 }
    );
  }
}

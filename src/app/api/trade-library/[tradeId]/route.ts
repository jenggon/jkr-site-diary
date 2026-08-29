import { NextResponse } from 'next/server';
import { tradeLibraryService } from '@/services/tradeLibraryService';

type RouteParams = {
  params: Promise<{ tradeId: string }>;
};

/**
 * GET /api/trade-library/[tradeId]
 * Retrieves a Trade reference entry by ID.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { tradeId } = await context.params;

    if (!tradeId || typeof tradeId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: tradeId' },
        { status: 400 }
      );
    }

    const trade = await tradeLibraryService.getTradeById(tradeId);

    if (!trade) {
      return NextResponse.json(
        { error: 'Trade entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: trade }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/trade-library/[tradeId]
 * Updates an existing Trade reference entry.
 */
export async function PATCH(request: Request, context: RouteParams) {
  try {
    const { tradeId } = await context.params;

    if (!tradeId || typeof tradeId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: tradeId' },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid payload: Request body must be a valid JSON object' },
        { status: 400 }
      );
    }

    const updatedTrade = await tradeLibraryService.updateTrade(tradeId, body);

    return NextResponse.json({ data: updatedTrade }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

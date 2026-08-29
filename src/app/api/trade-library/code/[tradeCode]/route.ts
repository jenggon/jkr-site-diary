import { NextResponse } from 'next/server';
import { tradeLibraryService } from '@/services/tradeLibraryService';

type RouteParams = {
  params: Promise<{ tradeCode: string }>;
};

/**
 * GET /api/trade-library/code/[tradeCode]
 * Retrieves a Trade entry by unique trade code.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { tradeCode } = await context.params;

    if (!tradeCode || typeof tradeCode !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid route parameter: tradeCode' },
        { status: 400 }
      );
    }

    const trade = await tradeLibraryService.getTradeByCode(tradeCode);

    if (!trade) {
      return NextResponse.json(
        { error: 'Trade entry for specified trade code not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: trade }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve trade by code' },
      { status: 500 }
    );
  }
}

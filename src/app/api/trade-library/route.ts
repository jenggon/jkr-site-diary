import { NextResponse } from 'next/server';
import { extractVerifiedIdentity } from '@/app/api/_shared/identity';
import { getSupabaseAuthenticatedClient } from '@/lib/supabase';

const deriveTradeCode = (tradeName: string): string =>
  tradeName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);

/**
 * POST /api/trade-library
 * Creates or resolves a user-created Trade reference through the exact
 * authenticated DB-INVARIANT wrapper. Direct browser mutation remains revoked.
 */
export async function POST(request: Request) {
  try {
    const identity = await extractVerifiedIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid payload: Request body must be a valid JSON object' },
        { status: 400 }
      );
    }

    const tradeName = typeof body.trade_name === 'string' ? body.trade_name.trim() : '';
    const suppliedCode = typeof body.trade_code === 'string' ? body.trade_code.trim() : '';
    const tradeCode = suppliedCode || deriveTradeCode(tradeName);

    if (!tradeName) {
      return NextResponse.json(
        { error: 'Missing required field: trade_name' },
        { status: 400 }
      );
    }

    if (!tradeCode) {
      return NextResponse.json(
        { error: 'Unable to derive trade_code from trade_name' },
        { status: 400 }
      );
    }

    const client = getSupabaseAuthenticatedClient(identity.accessToken);
    const { data, error } = await client.rpc('f1_create_trade_atomic', {
      p_trade_code: tradeCode,
      p_trade_name: tradeName,
    });

    if (error) {
      const conflict = error.message.includes('F1_TRADE_CODE_CONFLICT');
      return NextResponse.json(
        { error: conflict ? 'Trade code already belongs to a different trade name' : error.message },
        { status: conflict ? 409 : 400 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create trade entry' },
      { status: 500 }
    );
  }
}

import { supabase } from '@/lib/supabase';
import { TradeLibrary } from '@/types/tradeLibrary';

/**
 * Trade Library Repository
 *
 * Spec: DB-018 (trade_library)
 * Bounded Context: Master Data Engine / Workforce Engine
 * Primary Owner: Master Data Engine
 *
 * Provides low-level persistence operations (create, read, update) for TradeLibrary reference entities.
 * Contains no business logic, validation rules, or audit timestamp generation.
 */

// ============================================================
// Trade Library Persistence Operations
// ============================================================

/**
 * Create a new Trade entry in Trade Library.
 * Spec: DB-018
 */
export async function createTrade(
  data: Omit<TradeLibrary, 'trade_id' | 'created_at'> & {
    trade_id?: string;
    created_at?: string;
  }
): Promise<TradeLibrary> {
  const { data: result, error } = await supabase
    .from('trade_library')
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create trade: ${error.message}`);
  }

  return result as TradeLibrary;
}

/**
 * Retrieve a Trade by primary key (trade_id).
 * Spec: DB-018
 */
export async function getTradeById(tradeId: string): Promise<TradeLibrary | null> {
  const { data, error } = await supabase
    .from('trade_library')
    .select('*')
    .eq('trade_id', tradeId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get trade by ID: ${error.message}`);
  }

  return data as TradeLibrary | null;
}

/**
 * Retrieve a Trade by unique trade code (trade_code).
 * Spec: DB-018
 */
export async function getTradeByCode(tradeCode: string): Promise<TradeLibrary | null> {
  const { data, error } = await supabase
    .from('trade_library')
    .select('*')
    .eq('trade_code', tradeCode)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get trade by code: ${error.message}`);
  }

  return data as TradeLibrary | null;
}

/**
 * Retrieve all active Trades from Trade Library.
 * Spec: DB-018
 */
export async function getAllActiveTrades(): Promise<TradeLibrary[]> {
  const { data, error } = await supabase
    .from('trade_library')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to get active trades: ${error.message}`);
  }

  return (data || []) as TradeLibrary[];
}

/**
 * Update an existing Trade record in Trade Library.
 * Spec: DB-018
 */
export async function updateTrade(
  tradeId: string,
  updates: Partial<TradeLibrary>
): Promise<TradeLibrary> {
  const { data: result, error } = await supabase
    .from('trade_library')
    .update(updates)
    .eq('trade_id', tradeId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update trade: ${error.message}`);
  }

  return result as TradeLibrary;
}

export const tradeLibraryRepository = {
  createTrade,
  getTradeById,
  getTradeByCode,
  getAllActiveTrades,
  updateTrade,
};

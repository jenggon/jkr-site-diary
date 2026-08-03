import { TradeLibrary } from '@/types/tradeLibrary';
import { tradeLibraryRepository } from '@/repositories/tradeLibraryRepository';

/**
 * Trade Library Business Service
 *
 * Specs: DB-018 (trade_library)
 * ADRs: ADR-007, ADR-009, ADR-010
 * Business Rules: WF-002
 *
 * Responsible for Trade Library business orchestration, audit metadata population,
 * and reference data defaults.
 * Operates strictly through tradeLibraryRepository with zero direct database access.
 */

/**
 * Create a new Trade entry in Trade Library.
 * Populates created_at audit metadata and defaults (is_active = true, display_order = 0).
 *
 * Specs: DB-018, WF-002
 */
export async function createTrade(
  data: Omit<TradeLibrary, 'trade_id' | 'created_at'> & {
    trade_id?: string;
    created_at?: string;
  }
): Promise<TradeLibrary> {
  const createdAt = new Date().toISOString();
  const isActive = data.is_active ?? true;
  const displayOrder = data.display_order ?? 0;

  return tradeLibraryRepository.createTrade({
    ...data,
    is_active: isActive,
    display_order: displayOrder,
    created_at: createdAt,
  });
}

/**
 * Retrieve a Trade by its primary key.
 * Delegates persistence to tradeLibraryRepository.
 *
 * Specs: DB-018
 */
export async function getTradeById(tradeId: string): Promise<TradeLibrary | null> {
  return tradeLibraryRepository.getTradeById(tradeId);
}

/**
 * Retrieve a Trade by its unique trade code.
 * Delegates persistence to tradeLibraryRepository.
 *
 * Specs: DB-018
 */
export async function getTradeByCode(tradeCode: string): Promise<TradeLibrary | null> {
  return tradeLibraryRepository.getTradeByCode(tradeCode);
}

/**
 * Retrieve all active Trades for UI selection.
 * Delegates persistence to tradeLibraryRepository.
 *
 * Specs: DB-018
 */
export async function getAllActiveTrades(): Promise<TradeLibrary[]> {
  return tradeLibraryRepository.getAllActiveTrades();
}

/**
 * NOTE
 *
 * Atomic execution is required by ADR-010 where business operations require it.
 *
 * The Infrastructure layer is responsible for providing the
 * required atomic execution mechanism during a future
 * implementation task.
 *
 * This Service intentionally contains no infrastructure logic.
 */
export async function updateTrade(
  tradeId: string,
  updates: Partial<TradeLibrary>
): Promise<TradeLibrary> {
  // NOTE:
  // ADR-010 requires this business operation to execute atomically.
  // The Infrastructure layer will provide the required implementation.
  // This Service intentionally performs business orchestration only.
  const updatedAt = new Date().toISOString();

  return tradeLibraryRepository.updateTrade(tradeId, {
    ...updates,
    updated_at: updatedAt,
  });
}

export const tradeLibraryService = {
  createTrade,
  getTradeById,
  getTradeByCode,
  getAllActiveTrades,
  updateTrade,
};

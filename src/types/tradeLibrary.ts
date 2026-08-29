/**
 * Trade Library Domain Model
 *
 * Project: JKR Site Diary Platform
 * Specs: DB-018 (Trade Library Schema)
 * ADRs: ADR-007, ADR-009
 * Business Rules: WF-002
 */

/**
 * Trade Library Domain Model
 *
 * Master reference directory for all recognised construction trades used throughout the platform.
 * Provides consistent classification of workforce trades across all Programmes.
 *
 * @see DB-018 (Trade Library Schema)
 * @see WF-002 (Trade Library)
 */
export interface TradeLibrary {
  /** Primary Key (UUID) */
  trade_id: string;

  /** Business Identity - Unique trade code (e.g. BAR_BENDER, CARPENTER, STEEL_FIXER) */
  trade_code: string;

  /** Trade - Official trade name (e.g. Bar Bender, Carpenter, Steel Fixer) */
  trade_name: string;

  /** Trade - Category classification (e.g. General Worker, Skilled Worker, Technical) */
  trade_category: string | null;

  /** Trade - Description of the trade */
  description: string | null;

  /** Display - UI sorting display order */
  display_order: number;

  /** Status - Active flag (inactive trades cannot be selected for new records) */
  is_active: boolean;

  /** Audit - Timestamp record was created */
  created_at: string;

  /** Audit - User ID who created the trade record */
  created_by: string;

  /** Audit - Timestamp record was updated */
  updated_at: string | null;

  /** Audit - User ID who updated the trade record */
  updated_by: string | null;
}

import { TradeSelection as TreTradeSelection, TradeResolutionSource } from '@/types/tre';
import { TradeSelection as ActivityTradeSelection, TradeSource } from '@/types/openActivity';

/**
 * Maps a TRE-domain TradeSelection to an Activity-domain TradeSelection.
 *
 * This is the ONLY place that knows about the cross-boundary type incompatibility
 * between @/types/tre and @/types/openActivity.
 *
 * Owner: OpenActivityService (sole consumer)
 * Namespace: src/services/mappers/ (service-layer internal)
 * Allowed importers: OpenActivityService.ts only
 *
 * Uses `satisfies` for compile-time exhaustive key coverage —
 * TypeScript will error if a new TradeResolutionSource is added without updating this map.
 */
const SOURCE_MAP = {
  MSP_RESOURCE: 'MSPResource',
  KNOWLEDGE_ENGINE: 'KnowledgeEngine',
  TRADE_LIBRARY: 'TradeLibrary',
} satisfies Record<TradeResolutionSource, TradeSource>;

export function mapTreSelectionToActivityTrade(
  treSelection: TreTradeSelection
): ActivityTradeSelection {
  return {
    tradeId: treSelection.tradeId,
    tradeCode: treSelection.tradeCode,
    tradeName: treSelection.tradeName,
    source: SOURCE_MAP[treSelection.resolutionSource],
  };
}

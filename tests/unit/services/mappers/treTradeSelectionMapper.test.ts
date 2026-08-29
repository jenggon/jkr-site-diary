import { describe, it, expect } from 'vitest';
import { mapTreSelectionToActivityTrade } from '@/services/mappers/treTradeSelectionMapper';
import { TradeSelection as TreTradeSelection } from '@/types/tre';

describe('mapTreSelectionToActivityTrade', () => {
  const baseTreSelection: Omit<TreTradeSelection, 'resolutionSource'> = {
    tradeId: 'trade-uuid-001',
    tradeCode: 'CONCRETOR',
    tradeName: 'Pekerja Konkrit',
    tradeCategory: 'Skilled',
  };

  it('maps MSP_RESOURCE source to MSPResource', () => {
    const input: TreTradeSelection = {
      ...baseTreSelection,
      resolutionSource: 'MSP_RESOURCE',
    };
    const result = mapTreSelectionToActivityTrade(input);

    expect(result.source).toBe('MSPResource');
    expect(result.tradeId).toBe('trade-uuid-001');
    expect(result.tradeCode).toBe('CONCRETOR');
    expect(result.tradeName).toBe('Pekerja Konkrit');
  });

  it('maps KNOWLEDGE_ENGINE source to KnowledgeEngine', () => {
    const input: TreTradeSelection = {
      ...baseTreSelection,
      resolutionSource: 'KNOWLEDGE_ENGINE',
    };
    const result = mapTreSelectionToActivityTrade(input);

    expect(result.source).toBe('KnowledgeEngine');
    expect(result.tradeId).toBe('trade-uuid-001');
    expect(result.tradeCode).toBe('CONCRETOR');
    expect(result.tradeName).toBe('Pekerja Konkrit');
  });

  it('maps TRADE_LIBRARY source to TradeLibrary', () => {
    const input: TreTradeSelection = {
      ...baseTreSelection,
      resolutionSource: 'TRADE_LIBRARY',
    };
    const result = mapTreSelectionToActivityTrade(input);

    expect(result.source).toBe('TradeLibrary');
    expect(result.tradeId).toBe('trade-uuid-001');
    expect(result.tradeCode).toBe('CONCRETOR');
    expect(result.tradeName).toBe('Pekerja Konkrit');
  });

  it('drops tradeCategory — activity TradeSelection has no tradeCategory field', () => {
    const input: TreTradeSelection = {
      ...baseTreSelection,
      tradeCategory: 'Specialist',
      resolutionSource: 'MSP_RESOURCE',
    };
    const result = mapTreSelectionToActivityTrade(input);

    expect('tradeCategory' in result).toBe(false);
  });

  it('preserves tradeId, tradeCode, tradeName field values exactly', () => {
    const input: TreTradeSelection = {
      tradeId: 'unique-id-xyz',
      tradeCode: 'BAR_BENDER',
      tradeName: 'Pemasang Tetulang',
      tradeCategory: null,
      resolutionSource: 'KNOWLEDGE_ENGINE',
    };
    const result = mapTreSelectionToActivityTrade(input);

    expect(result.tradeId).toBe('unique-id-xyz');
    expect(result.tradeCode).toBe('BAR_BENDER');
    expect(result.tradeName).toBe('Pemasang Tetulang');
  });
});

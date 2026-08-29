export interface InferredTrade {
  readonly tradeCode: string | null;
  readonly tradeName: string | null;
}

/**
 * Rule-based Trade Inferencer for MSP Tasks.
 * Matches task names against deterministic keyword rules.
 * 
 * Rules:
 * - "konkrit" / "concrete" -> CONCRETOR / Concrete Specialist
 * - "tetulang" / "rebar" / "steel" -> BAR_BENDER / Bar Bender
 * - "acuan" / "formwork" / "kayu" -> CARPENTER / Formwork Carpenter
 * - "paip" / "plumbing" -> PLUMBER / Plumbing Specialist
 * - "cat" / "paint" -> PAINTER / Painting Specialist
 * - No match -> null / null
 */
export class MspTradeInferencer {
  private static readonly RULES: Array<{
    readonly keywords: readonly string[];
    readonly tradeCode: string;
    readonly tradeName: string;
  }> = [
    {
      keywords: ['konkrit', 'concrete'],
      tradeCode: 'CONCRETOR',
      tradeName: 'Concrete Specialist',
    },
    {
      keywords: ['tetulang', 'rebar', 'steel'],
      tradeCode: 'BAR_BENDER',
      tradeName: 'Bar Bender',
    },
    {
      keywords: ['acuan', 'formwork', 'kayu'],
      tradeCode: 'CARPENTER',
      tradeName: 'Formwork Carpenter',
    },
    {
      keywords: ['paip', 'plumbing'],
      tradeCode: 'PLUMBER',
      tradeName: 'Plumbing Specialist',
    },
    {
      keywords: ['cat', 'paint'],
      tradeCode: 'PAINTER',
      tradeName: 'Painting Specialist',
    },
  ];

  public static inferTrade(taskName: string): InferredTrade {
    if (!taskName || taskName.trim() === '') {
      return { tradeCode: null, tradeName: null };
    }

    const normalized = taskName.toLowerCase();

    for (const rule of MspTradeInferencer.RULES) {
      if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
        return {
          tradeCode: rule.tradeCode,
          tradeName: rule.tradeName,
        };
      }
    }

    return { tradeCode: null, tradeName: null };
  }
}

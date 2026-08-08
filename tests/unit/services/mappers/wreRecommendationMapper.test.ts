import { describe, it, expect } from 'vitest';
import { mapWreResolutionToActivityWorkforceCount } from '@/services/mappers/wreRecommendationMapper';
import { WorkforceResolution } from '@/types/wre';

describe('wreRecommendationMapper', () => {
  it('maps WorkforceResolution to workforceCount correctly', () => {
    const resolution: WorkforceResolution = {
      recommendation: {
        items: [],
        totalWorkforceCount: 42,
      },
      resolutionSource: 'TRADE_WORKFORCE_LIBRARY',
      confidenceLevel: 'HIGH',
      provenance: { repository: 'dummy', evaluator: null, ruleId: null, ruleVersion: null, matchedPriority: 'TRADE_WORKFORCE_LIBRARY', matchedDiscipline: null },
      diagnostics: { evaluationStage: 'TRADE_WORKFORCE_LIBRARY', durationMs: 5, evaluatorsAttemptedCount: 1, timestamp: 'now' },
      reasoning: { reasonCode: 'OK', reasonDescription: 'OK' },
      metadata: { generatedAt: 'now', engineVersion: '1', executionDurationMs: 5, platformVersion: '1.0' },
    };

    const count = mapWreResolutionToActivityWorkforceCount(resolution);
    expect(count).toBe(42);
  });
});

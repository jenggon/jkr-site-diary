import { describe, it, expect, vi } from 'vitest';
import { KnowledgeEngineService } from '@/services/KnowledgeEngineService';
import { IKnowledgeHistoryRepository } from '@/repositories/KnowledgeHistoryRepository';
import { IClock } from '@/lib/IClock';
import { Logger } from '@/lib/logger';
import { isSuccess, Success } from '@/lib/result';
import { KnowledgeEvaluationContext } from '@/types/knowledge';

describe('KnowledgeEngineService', () => {
  const mockClock: IClock = {
    nowIso: () => '2026-08-08T12:00:00.000Z',
    nowUtcDate: () => new Date('2026-08-08T12:00:00.000Z'),
  };

  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: () => mockLogger,
  } as unknown as Logger;

  const sampleContext: KnowledgeEvaluationContext = {
    siteDiaryId: 'diary-100',
    programmeId: 'prog-1',
    mspTaskId: 'task-50', // AHI
    activityName: 'Kerja Konkrit Bangunan',
    subtaskName: 'Lantai',
  };

  const mockHistoryData = [
    {
      subtask: 'Lantai',
      created_at: '2026-08-07T12:00:00.000Z', // 1 day ago
      manpower: [{ trade_name: 'CONCRETOR' }]
    },
    {
      subtask: 'Dinding',
      created_at: '2026-08-01T12:00:00.000Z', // 7 days ago
      manpower: [{ trade_name: 'STEEL_FIXER' }, { trade_name: 'CONCRETOR' }]
    },
    {
      subtask: 'Lantai',
      created_at: '2026-07-08T12:00:00.000Z', // 31 days ago (ageDays > 30)
      manpower: [{ trade_name: 'CARPENTER' }]
    }
  ];

  it('evaluates historical records and returns top 3 recommendations', async () => {
    const mockRepo: IKnowledgeHistoryRepository = {
      getHistoryByAhi: vi.fn().mockResolvedValue(Success(mockHistoryData)),
    };

    const service = new KnowledgeEngineService({
      historyRepository: mockRepo,
      clock: mockClock,
      logger: mockLogger,
    });

    const result = await service.evaluate(sampleContext);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result) && result.value) {
      const recommendations = result.value;
      expect(recommendations.length).toBe(3);
      
      // Expected scores:
      // CONCRETOR: Freq=2
      // - row 1: AHI(20) + Subtask(50) + Recency(29) + Freq(2*15=30) = 129
      // - row 2: AHI(20) + Recency(23) + Freq(30) = 73
      // Total CONCRETOR = 202

      // STEEL_FIXER: Freq=1
      // - row 2: AHI(20) + Recency(23) + Freq(15) = 58

      // CARPENTER: Freq=1
      // - row 3: AHI(20) + Subtask(50) + Recency(0) + Freq(15) = 85

      expect(recommendations[0]?.tradeCode).toBe('CONCRETOR'); // Score ~202
      expect(recommendations[1]?.tradeCode).toBe('CARPENTER'); // Score ~85
      expect(recommendations[2]?.tradeCode).toBe('STEEL_FIXER'); // Score ~58
    }
  });

  it('returns empty array when no historical data matches', async () => {
    const mockRepo: IKnowledgeHistoryRepository = {
      getHistoryByAhi: vi.fn().mockResolvedValue(Success([])),
    };

    const service = new KnowledgeEngineService({
      historyRepository: mockRepo,
      clock: mockClock,
      logger: mockLogger,
    });

    const result = await service.evaluate(sampleContext);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toEqual([]);
    }
  });

  it('records internal observability diagnostics during evaluation', async () => {
    const mockRepo: IKnowledgeHistoryRepository = {
      getHistoryByAhi: vi.fn().mockResolvedValue(Success(mockHistoryData)),
    };

    const service = new KnowledgeEngineService({
      historyRepository: mockRepo,
      clock: mockClock,
      logger: mockLogger,
    });

    await service.evaluate(sampleContext);

    expect(mockLogger.info).toHaveBeenCalledWith(
      'KRE evaluation completed',
      expect.objectContaining({
        diagnostics: expect.objectContaining({
          rulesLoaded: 3,
          rulesEvaluated: 3,
          rulesMatched: 3,
        }),
        recommendations: expect.any(Array)
      })
    );
  });
});

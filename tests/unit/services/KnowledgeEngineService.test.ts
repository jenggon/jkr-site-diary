import { describe, it, expect, vi } from 'vitest';
import { KnowledgeEngineService } from '@/services/KnowledgeEngineService';
import { IKnowledgeRuleRepository } from '@/repositories/IKnowledgeRuleRepository';
import { RuleEvaluatorRegistry } from '@/services/evaluators/RuleEvaluatorRegistry';
import { TaskRuleEvaluator } from '@/services/evaluators/TaskRuleEvaluator';
import { BuildingTypeRuleEvaluator } from '@/services/evaluators/BuildingTypeRuleEvaluator';
import { DisciplineRuleEvaluator } from '@/services/evaluators/DisciplineRuleEvaluator';
import { HistoryRuleEvaluator } from '@/services/evaluators/HistoryRuleEvaluator';
import { IClock } from '@/lib/IClock';
import { Logger } from '@/lib/logger';
import { isSuccess } from '@/lib/result';
import { KnowledgeRule, KnowledgeEvaluationContext } from '@/types/knowledge';

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
    mspTaskId: 'task-50',
    activityName: 'Kerja Konkrit Bangunan',
    buildingType: 'COMMERCIAL',
    disciplineCode: 'STRUCTURAL',
    historicalTradeCodes: ['CONCRETOR'],
  };

  const ruleTaskGeneric: KnowledgeRule = {
    ruleId: 'rule-task-generic',
    ruleCode: 'RULE_TASK_GENERIC',
    ruleName: 'Generic Task Rule',
    version: 1,
    priority: 10,
    category: 'TASK',
    conditions: { activity_keyword: 'Konkrit' },
    recommendedTradeCode: 'CONCRETOR_GENERIC',
    reasonCode: 'RULE_MATCH_TASK_GENERIC',
    reasonDescription: 'Matched task activity keyword',
    effectiveFrom: '2026-01-01T00:00:00.000Z',
    effectiveUntil: null,
    status: 'ACTIVE',
    governance: { owner: 'HQ', createdBy: 'admin', approvedBy: 'architect', lastReviewedAt: null, reviewIntervalDays: 30 },
  };

  const ruleTaskSpecific: KnowledgeRule = {
    ruleId: 'rule-task-specific',
    ruleCode: 'RULE_TASK_SPECIFIC',
    ruleName: 'Specific Task Rule',
    version: 1,
    priority: 10,
    category: 'TASK',
    conditions: { task_code: 'task-50', activity_keyword: 'Konkrit' },
    recommendedTradeCode: 'CONCRETOR_SPECIFIC',
    reasonCode: 'RULE_MATCH_TASK_SPECIFIC',
    reasonDescription: 'Matched task code and activity keyword',
    effectiveFrom: '2026-01-01T00:00:00.000Z',
    effectiveUntil: null,
    status: 'ACTIVE',
    governance: { owner: 'HQ', createdBy: 'admin', approvedBy: 'architect', lastReviewedAt: null, reviewIntervalDays: 30 },
  };

  const ruleHighPriorityBuilding: KnowledgeRule = {
    ruleId: 'rule-building-high',
    ruleCode: 'RULE_BUILDING_HIGH',
    ruleName: 'High Priority Building Rule',
    version: 2,
    priority: 50,
    category: 'BUILDING',
    conditions: { building_type: 'COMMERCIAL' },
    recommendedTradeCode: 'COMMERCIAL_SPECIALIST',
    reasonCode: 'RULE_MATCH_BUILDING_HIGH',
    reasonDescription: 'Matched commercial building type with high priority',
    effectiveFrom: '2026-01-01T00:00:00.000Z',
    effectiveUntil: null,
    status: 'ACTIVE',
    governance: { owner: 'HQ', createdBy: 'admin', approvedBy: 'architect', lastReviewedAt: null, reviewIntervalDays: 30 },
  };

  function createRegistry(): RuleEvaluatorRegistry {
    const registry = new RuleEvaluatorRegistry();
    registry.register(new TaskRuleEvaluator());
    registry.register(new BuildingTypeRuleEvaluator());
    registry.register(new DisciplineRuleEvaluator());
    registry.register(new HistoryRuleEvaluator());
    return registry;
  }

  it('evaluates candidate rules and returns top priority recommendation', async () => {
    const mockRepo: IKnowledgeRuleRepository = {
      findCandidateRules: vi.fn().mockResolvedValue([ruleTaskGeneric, ruleHighPriorityBuilding]),
    };

    const service = new KnowledgeEngineService({
      ruleRepository: mockRepo,
      evaluatorRegistry: createRegistry(),
      clock: mockClock,
      logger: mockLogger,
    });

    const result = await service.evaluate(sampleContext);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result) && result.value) {
      expect(result.value.tradeCode).toBe('COMMERCIAL_SPECIALIST');
      expect(result.value.reasonCode).toBe('RULE_MATCH_BUILDING_HIGH');
      expect(result.value.source).toBe('KNOWLEDGE_ENGINE');
      expect(result.value.matchedRules.length).toBe(2);
    }
  });

  it('uses Specificity score to break priority ties', async () => {
    const mockRepo: IKnowledgeRuleRepository = {
      findCandidateRules: vi.fn().mockResolvedValue([ruleTaskGeneric, ruleTaskSpecific]),
    };

    const service = new KnowledgeEngineService({
      ruleRepository: mockRepo,
      evaluatorRegistry: createRegistry(),
      clock: mockClock,
      logger: mockLogger,
    });

    const result = await service.evaluate(sampleContext);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result) && result.value) {
      expect(result.value.tradeCode).toBe('CONCRETOR_SPECIFIC');
      expect(result.value.matchedRules[0]?.specificityScore).toBe(2);
    }
  });

  it('executes 100% deterministically given identical inputs', async () => {
    const mockRepo: IKnowledgeRuleRepository = {
      findCandidateRules: vi.fn().mockResolvedValue([ruleTaskGeneric, ruleTaskSpecific, ruleHighPriorityBuilding]),
    };

    const service = new KnowledgeEngineService({
      ruleRepository: mockRepo,
      evaluatorRegistry: createRegistry(),
      clock: mockClock,
      logger: mockLogger,
    });

    const res1 = await service.evaluate(sampleContext);
    const res2 = await service.evaluate(sampleContext);

    expect(isSuccess(res1)).toBe(true);
    expect(isSuccess(res2)).toBe(true);
    if (isSuccess(res1) && isSuccess(res2)) {
      expect(res1.value).toEqual(res2.value);
    }
  });

  it('returns Success(null) when no candidate rules match', async () => {
    const mockRepo: IKnowledgeRuleRepository = {
      findCandidateRules: vi.fn().mockResolvedValue([]),
    };

    const service = new KnowledgeEngineService({
      ruleRepository: mockRepo,
      evaluatorRegistry: createRegistry(),
      clock: mockClock,
      logger: mockLogger,
    });

    const result = await service.evaluate(sampleContext);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBeNull();
    }
  });

  it('records internal observability diagnostics during evaluation', async () => {
    const mockRepo: IKnowledgeRuleRepository = {
      findCandidateRules: vi.fn().mockResolvedValue([ruleTaskGeneric]),
    };

    const service = new KnowledgeEngineService({
      ruleRepository: mockRepo,
      evaluatorRegistry: createRegistry(),
      clock: mockClock,
      logger: mockLogger,
    });

    await service.evaluate(sampleContext);

    expect(mockLogger.info).toHaveBeenCalledWith(
      'KRE evaluation completed',
      expect.objectContaining({
        diagnostics: expect.objectContaining({
          rulesLoaded: 1,
          rulesEvaluated: 1,
          rulesMatched: 1,
          selectedRuleId: 'rule-task-generic',
        }),
      })
    );
  });
});

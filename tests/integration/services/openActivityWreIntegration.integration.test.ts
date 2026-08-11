import { describe, it, expect } from 'vitest';
import { WorkforceEngineService } from '@/services/WorkforceEngineService';
import { TreEngineService } from '@/services/TreEngineService';
import { ProgramKerjaBoundaryService, ProgramKerjaBoundaryServiceDependencies } from '@/services/ProgramKerjaBoundaryService';
import { SystemClock } from '@/lib/clock';
import { isSuccess } from '@/lib/result';
import { MspWorkforceResourceRecord, IMspWorkforceRepository } from '@/repositories/IMspWorkforceRepository';
import { Logger } from '@/lib/logger';
describe('WorkforceEngineService Integration (WRE sequentially after TRE)', () => {
  const clock = new SystemClock();
  const silentLogger = {
    info: () => {}, error: () => {}, warn: () => {}, debug: () => {}, child: () => silentLogger,
  } as unknown as Logger;

  it('orchestrates TRE followed by WRE sequentially during activity creation', async () => {
    // 1. Setup mock TRE boundary to resolve a known trade
    const mockBoundaryService = new ProgramKerjaBoundaryService({
      taskRepository: {
        getTaskById: async () => ({
          task_id: 'task-10',
          programme_id: 'prog-1',
          revision_id: 'rev-1',
          task_uid: 10,
          task_guid: null,
          wbs: '1.2',
          task_name: 'Concreting Task',
          parent_task_uid: null,
          outline_level: 1,
          outline_number: '1.2',
          trade_code: 'CONCRETOR',
          trade_name: 'Concrete Specialist',
          display_order: 1,
          planned_start: null,
          planned_finish: null,
          planned_duration_days: null,
          is_milestone: false,
          is_critical: false,
          is_summary: false,
          constraint_type: null,
          constraint_date: null,
          created_at: '2026-08-01',
          created_by: 'user-1',
        }),
      } as unknown as ProgramKerjaBoundaryServiceDependencies['taskRepository'],
    });

    const treEngine = new TreEngineService({
      programKerjaBoundaryService: mockBoundaryService,
      tradeLibraryRepository: { getDefaultTrade: async () => null, getTradeByCode: async () => null, getTradeById: async () => null },
      knowledgeEngineAdapter: { getTopRecommendation: async () => null },
      clock,
      logger: silentLogger,
    });

    // 2. Resolve TRE
    const treResult = await treEngine.resolveTradeRecommendation({
      siteDiaryId: 'diary-integration-1',
      programmeId: 'prog-1',
      revisionId: 'rev-1',
      mspTaskId: 'task-10',
      activityName: 'Kerja-kerja Konkrit Asas',
    });

    expect(isSuccess(treResult)).toBe(true);
    const resolvedTrade = isSuccess(treResult) ? treResult.value : undefined;
    expect(resolvedTrade).toBeDefined();

    // 3. Setup WRE with a mock repository that responds to the TRE result
    const sampleMspWorkforceTrade: MspWorkforceResourceRecord = {
      roleCode: 'SKILLED',
      tradeId: resolvedTrade!.tradeId,
      tradeCode: resolvedTrade!.tradeCode,
      tradeName: resolvedTrade!.tradeName,
      allocatedCount: 42,
      skillLevel: 'Skilled',
      isMandatory: true,
    };

    const wreEngine = new WorkforceEngineService({
      mspWorkforceRepository: {
        findWorkforceByMspTask: async (_progId: string, taskId: string) => {
          if (taskId === 'task-10') {
            return [sampleMspWorkforceTrade];
          }
          return [];
        },
      } as unknown as IMspWorkforceRepository,
      tradeWorkforceLibraryRepository: { getWorkforceCompositionByTrade: async () => null },
      workforceRuleRepository: { getRulesByDiscipline: async () => [] },
      evaluatorRegistry: { getEvaluatorsForDiscipline: () => [], register: () => {} },
      clock,
      logger: silentLogger,
    });

    // 4. Resolve WRE passing the TRE context
    const wreResult = await wreEngine.resolveWorkforceRecommendation({
      siteDiaryId: 'diary-integration-1',
      programmeId: 'prog-1',
      revisionId: 'rev-1',
      mspTaskId: 'task-10',
      activityName: 'Concreting Task',
      tradeSelection: resolvedTrade!,
    });

    expect(isSuccess(wreResult)).toBe(true);
    if (isSuccess(wreResult)) {
      expect(wreResult.value.recommendation.totalWorkforceCount).toBe(42);
      expect(wreResult.value.resolutionSource).toBe('MSP_RESOURCE');
    }
  });
});

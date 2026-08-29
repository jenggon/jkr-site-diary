import sys

def process_service():
    with open('src/services/OpenActivityService.ts', 'r') as f:
        content = f.read()

    # Imports
    content = content.replace(
        "import { IWorkforceEngineService } from '@/services/IWorkforceEngineService';",
        "import { IWorkforceEngineService } from '@/services/IWorkforceEngineService';\nimport { IMaterialEngineService } from '@/services/IMaterialEngineService';"
    )
    content = content.replace(
        "import { WorkforceResolutionContext, WorkforceResolutionObservabilityEvent } from '@/types/wre';",
        "import { WorkforceResolutionContext, WorkforceResolutionObservabilityEvent } from '@/types/wre';\nimport { MaterialResolutionContext, MaterialResolutionObservabilityEvent, MaterialRecommendationSnapshot } from '@/types/mre';"
    )
    content = content.replace(
        "import { mapWreResolutionToActivityWorkforceCount } from '@/services/mappers/wreRecommendationMapper';",
        "import { mapWreResolutionToActivityWorkforceCount } from '@/services/mappers/wreRecommendationMapper';\nimport { toSnapshot as mapMreResolutionToSnapshot } from '@/services/mappers/materialRecommendationMapper';"
    )

    # Dependencies
    content = content.replace(
        "  readonly workforceEngine: IWorkforceEngineService;\n}",
        "  readonly workforceEngine: IWorkforceEngineService;\n  readonly materialEngine: IMaterialEngineService;\n}"
    )

    # Private properties
    content = content.replace(
        "  private readonly workforceEngine: IWorkforceEngineService;\n\n  constructor",
        "  private readonly workforceEngine: IWorkforceEngineService;\n  private readonly materialEngine: IMaterialEngineService;\n\n  constructor"
    )

    # Constructor injection
    content = content.replace(
        "    this.workforceEngine = deps.workforceEngine;\n  }",
        "    this.workforceEngine = deps.workforceEngine;\n    this.materialEngine = deps.materialEngine;\n  }"
    )

    # MRE block
    search_block = '''        }
      }
    }

    try {
      const newActivity: OpenActivity = {
        activityId,
        siteDiaryId: cmd.siteDiaryId,
        programmeId: cmd.programmeId,
        taskId: cmd.taskId,
        activityName: cmd.activityName,
        location: cmd.location,
        tradeInfo: resolvedTradeInfo,
        workforceCount: resolvedWorkforceCount,
        status: 'Planned','''
    
    mre_block = '''        }
      }
    }

    // MRE auto-resolution: only when caller did not supply materialSnapshot and trade is resolved
    let resolvedMaterialSnapshot: MaterialRecommendationSnapshot | undefined = cmd.materialSnapshot;

    if (cmd.materialSnapshot === undefined && resolvedTradeInfo !== undefined) {
      const mreCtx: MaterialResolutionContext = {
        siteDiaryId: cmd.siteDiaryId,
        programmeId: cmd.programmeId,
        mspTaskId: cmd.taskId,
        activityName: cmd.activityName,
        tradeSelection: resolvedTradeInfo,
        policy: {
          allowSubstitution: true,
          allowPartialRecommendation: true,
          includeOptionalMaterials: true,
          respectRegionalRestriction: false,
          respectSupplierRestriction: false,
        }
      };

      const mreStart = Date.now();
      const mreResult = await this.materialEngine.resolveMaterialRecommendation(mreCtx);
      const durationMs = Date.now() - mreStart;

      if (isSuccess(mreResult)) {
        resolvedMaterialSnapshot = mapMreResolutionToSnapshot(activityId, cmd.siteDiaryId, mreResult.value);

        const observabilityEvent: MaterialResolutionObservabilityEvent = {
          requestId,
          activityId,
          programmeId: cmd.programmeId,
          tradeId: resolvedTradeInfo.tradeId,
          resolutionSource: mreResult.value.resolutionSource,
          confidenceLevel: mreResult.value.confidenceLevel,
          evaluationStage: mreResult.value.diagnostics.evaluationStage,
          durationMs,
          materialCount: mreResult.value.recommendation.items.length,
          estimatedCost: mreResult.value.recommendation.totalEstimatedCost,
          timestamp: this.clock.nowIso(),
        };
        this.logger.info('MRE resolution succeeded', { mreResolution: observabilityEvent });
      } else {
        const error = mreResult.error;
        const isNotFound = error.errorCode === 'NO_MATERIAL_RECOMMENDATION_FOUND';

        const observabilityEvent: MaterialResolutionObservabilityEvent = {
          requestId,
          activityId,
          programmeId: cmd.programmeId,
          tradeId: resolvedTradeInfo.tradeId,
          resolutionSource: null,
          confidenceLevel: null,
          evaluationStage: 'ALL_SOURCES_EXHAUSTED',
          durationMs,
          materialCount: 0,
          estimatedCost: null,
          timestamp: this.clock.nowIso(),
        };

        if (isNotFound) {
          this.logger.warn(
            'MRE resolution exhausted all sources - activity will be created without materials',
            { mreResolution: observabilityEvent, failureReason: error.message, failureCode: error.errorCode }
          );
        } else {
          this.logger.error(
            'MRE engine error - activity will be created without materials',
            { mreResolution: observabilityEvent, failureReason: error.message, failureCode: error.errorCode }
          );
        }
      }
    }

    try {
      const newActivity: OpenActivity = {
        activityId,
        siteDiaryId: cmd.siteDiaryId,
        programmeId: cmd.programmeId,
        taskId: cmd.taskId,
        activityName: cmd.activityName,
        location: cmd.location,
        tradeInfo: resolvedTradeInfo,
        workforceCount: resolvedWorkforceCount,
        materialSnapshot: resolvedMaterialSnapshot,
        status: 'Planned','''
    
    content = content.replace(search_block, mre_block)

    # Update activity
    update_search = '''        activityName: cmd.activityName ?? existingRes.value.activityName,
        location: cmd.location ?? existingRes.value.location,
        tradeInfo: cmd.tradeSelection ?? existingRes.value.tradeInfo,
        workforceCount: cmd.workforceCount ?? existingRes.value.workforceCount,
        updatedAt,'''
    update_replace = '''        activityName: cmd.activityName ?? existingRes.value.activityName,
        location: cmd.location ?? existingRes.value.location,
        tradeInfo: cmd.tradeSelection ?? existingRes.value.tradeInfo,
        workforceCount: cmd.workforceCount ?? existingRes.value.workforceCount,
        materialSnapshot: cmd.materialSnapshot ?? existingRes.value.materialSnapshot,
        updatedAt,'''
    content = content.replace(update_search, update_replace)

    with open('src/services/OpenActivityService.ts', 'w') as f:
        f.write(content)

def process_test():
    with open('tests/unit/services/OpenActivityService.test.ts', 'r') as f:
        content = f.read()
    
    content = content.replace(
        "import { IWorkforceEngineService } from '@/services/IWorkforceEngineService';",
        "import { IWorkforceEngineService } from '@/services/IWorkforceEngineService';\nimport { IMaterialEngineService } from '@/services/IMaterialEngineService';"
    )

    mock_wre = '''  const mockWreNoOp: IWorkforceEngineService = {
    recommend: vi.fn(),
    resolveWorkforceRecommendation: vi.fn().mockResolvedValue(Success({
      recommendation: {
        items: [{ roleCode: 'GENERAL', tradeId: 'trade-1', tradeCode: 'GENERAL_WORKER', tradeName: 'Buruh Am', recommendedCount: 5, skillLevel: 'GENERAL', isMandatory: false }],
        totalWorkforceCount: 5,
      },
      resolutionSource: 'TRADE_WORKFORCE_LIBRARY',
      confidenceLevel: 'MEDIUM',
      provenance: { repository: 'TradeWorkforceLibraryRepository', evaluator: null, ruleId: null, ruleVersion: null, matchedPriority: 'TRADE_WORKFORCE_LIBRARY', matchedDiscipline: null },
      diagnostics: { evaluationStage: 'TRADE_WORKFORCE_LIBRARY', durationMs: 10, evaluatorsAttemptedCount: 0, timestamp: '2026-08-07T12:00:00Z' },
      reasoning: { reasonCode: 'DEFAULT', reasonDescription: 'Default resolution' },
      metadata: { generatedAt: '2026-08-07T12:00:00Z', engineVersion: '1.0', executionDurationMs: 10, platformVersion: '1.0' },
    })),
  } as unknown as IWorkforceEngineService;'''

    mock_mre = '''\n  const mockMreNoOp: IMaterialEngineService = {
    resolveMaterialRecommendation: vi.fn(),
  } as unknown as IMaterialEngineService;'''

    content = content.replace(mock_wre, mock_wre + mock_mre)

    content = content.replace(
        "treEngine: mockTreNoOp,\n      workforceEngine: mockWreNoOp,",
        "treEngine: mockTreNoOp,\n      workforceEngine: mockWreNoOp,\n      materialEngine: mockMreNoOp,"
    )

    content = content.replace(
        "workforceEngine?: IWorkforceEngineService",
        "workforceEngine?: IWorkforceEngineService, materialEngine?: IMaterialEngineService"
    )

    content = content.replace(
        "workforceEngine: overrides.workforceEngine ?? mockWreNoOp,\n    })",
        "workforceEngine: overrides.workforceEngine ?? mockWreNoOp,\n      materialEngine: overrides.materialEngine ?? mockMreNoOp,\n    })"
    )

    with open('tests/unit/services/OpenActivityService.test.ts', 'w') as f:
        f.write(content)

process_service()
process_test()

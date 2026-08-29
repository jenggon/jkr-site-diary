import { Result, Success, Failure, isSuccess } from '@/lib/result';
import { BaseAppError, UnknownError } from '@/lib/errors';
import { Logger } from '@/lib/logger';
import { ITreEngineService } from './ITreEngineService';
import { IWorkforceEngineService } from './IWorkforceEngineService';
import { IMaterialEngineService } from './IMaterialEngineService';
import { TradeSelection } from '@/types/tre';

import { WorkforceRecommendation } from '@/types/wre';
import { MaterialRecommendation } from '@/types/mre';

export interface ActivityIntelligenceSnapshot {
  readonly tradeResolution: TradeSelection | null;
  readonly workforceResolution: WorkforceRecommendation | null;
  readonly materialResolution: MaterialRecommendation | null;
}

export interface IntelligenceOrchestratorContext {
  readonly activityId: string;
  readonly programmeId: string;
  readonly revisionId?: string;
  readonly taskId?: string;
  readonly activityName: string;
  readonly location?: string;
}

export interface IIntelligenceOrchestratorService {
  /**
   * Orchestrates TRE -> WRE -> MRE resolution dynamically.
   * Does NOT persist to Activity table.
   */
  resolveActivityIntelligence(
    ctx: IntelligenceOrchestratorContext
  ): Promise<Result<ActivityIntelligenceSnapshot, BaseAppError>>;
}

export interface IIntelligenceOrchestratorDependencies {
  readonly treEngine: ITreEngineService;
  readonly workforceEngine: IWorkforceEngineService;
  readonly materialEngine: IMaterialEngineService;
  readonly logger: Logger;
}

export class IntelligenceOrchestratorService implements IIntelligenceOrchestratorService {
  private readonly treEngine: ITreEngineService;
  private readonly workforceEngine: IWorkforceEngineService;
  private readonly materialEngine: IMaterialEngineService;
  private readonly logger: Logger;

  constructor(deps: IIntelligenceOrchestratorDependencies) {
    this.treEngine = deps.treEngine;
    this.workforceEngine = deps.workforceEngine;
    this.materialEngine = deps.materialEngine;
    this.logger = deps.logger;
  }

  public async resolveActivityIntelligence(
    ctx: IntelligenceOrchestratorContext
  ): Promise<Result<ActivityIntelligenceSnapshot, BaseAppError>> {
    try {
      this.logger.info('Starting Intelligence Orchestration', { activityId: ctx.activityId });

      // 1. Resolve Trade (TRE)
      const treRes = await this.treEngine.resolveTradeRecommendation({
        siteDiaryId: ctx.activityId, // Using activityId contextually since it's transient
        programmeId: ctx.programmeId,
        revisionId: ctx.revisionId,
        mspTaskId: ctx.taskId,
        activityName: ctx.activityName,
      });

      let tradeResolution: TradeSelection | null = null;
      let workforceResolution = null;
      let materialResolution = null;

      if (isSuccess(treRes) && treRes.value) {
        tradeResolution = treRes.value;

        // 2. Resolve Workforce (WRE) based on resolved Trade
        const wreRes = await this.workforceEngine.resolveWorkforceRecommendation({
          siteDiaryId: ctx.activityId,
          programmeId: ctx.programmeId,
          revisionId: ctx.revisionId,
          mspTaskId: ctx.taskId,
          activityName: ctx.activityName,
          tradeSelection: tradeResolution,
        });

        if (isSuccess(wreRes) && wreRes.value) {
          workforceResolution = wreRes.value.recommendation;
        }

        // 3. Resolve Materials (MRE) based on resolved Trade
        const mreRes = await this.materialEngine.resolveMaterialRecommendation({
          siteDiaryId: ctx.activityId,
          programmeId: ctx.programmeId,
          revisionId: ctx.revisionId,
          mspTaskId: ctx.taskId,
          activityName: ctx.activityName,
          tradeSelection: tradeResolution,
          policy: {
            allowSubstitution: true,
            allowPartialRecommendation: true,
            includeOptionalMaterials: true,
            respectRegionalRestriction: false,
            respectSupplierRestriction: false,
          },
        });

        if (isSuccess(mreRes) && mreRes.value) {
          materialResolution = mreRes.value.recommendation;
        }
      }

      const snapshot: ActivityIntelligenceSnapshot = {
        tradeResolution,
        workforceResolution,
        materialResolution,
      };

      this.logger.info('Intelligence Orchestration Completed', { activityId: ctx.activityId });
      return Success(snapshot);
    } catch (err: unknown) {
      this.logger.error('Unhandled exception during Intelligence Orchestration', { error: err });
      return Failure(new UnknownError(err instanceof Error ? err.message : 'Orchestration failed'));
    }
  }
}

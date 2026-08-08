import { Result, Success, Failure, isSuccess } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { Logger } from '@/lib/logger';
import { IClock } from '@/lib/IClock';
import { TradeSelection, TreResolutionContext } from '@/types/tre';
import { TreEngineError, NoTradeRecommendationFoundError } from '@/errors/treErrors';
import { IProgramKerjaBoundaryService } from './IProgramKerjaBoundaryService';
import { ITradeLibraryRepository } from '@/repositories/ITradeLibraryRepository';
import { IKnowledgeEngineAdapter } from '@/services/adapters/IKnowledgeEngineAdapter';
import { ITreEngineService } from './ITreEngineService';

export interface ITreEngineServiceDependencies {
  readonly programKerjaBoundaryService: IProgramKerjaBoundaryService;
  readonly tradeLibraryRepository: ITradeLibraryRepository;
  readonly knowledgeEngineAdapter: IKnowledgeEngineAdapter;
  readonly clock: IClock;
  readonly logger: Logger;
}

/**
 * Trade Recommendation Engine (TRE) Service
 *
 * Enforces immutable 3-tier resolution priority:
 * 1. Priority 1: Program Kerja Operational Boundary (IProgramKerjaBoundaryService)
 * 2. Priority 2: Knowledge Recommendation Engine (IKnowledgeEngineAdapter)
 * 3. Priority 3: Master Trade Library (ITradeLibraryRepository)
 *
 * Operational Invariants:
 * - NO Direct MSP Repository Dependencies (consumes scheduling data via Program Kerja Boundary)
 * - NO Trade Scoring (scoring belongs exclusively to Knowledge Engine DEV-025)
 * - NO Caching (evaluates live source data on every call)
 * - NO Persistence (read-only orchestration engine)
 * - NO Domain Events (publishes zero events)
 * - NO Database Transactions (executes zero mutations)
 */
export class TreEngineService implements ITreEngineService {
  private readonly pkBoundary: IProgramKerjaBoundaryService;
  private readonly tradeLibRepo: ITradeLibraryRepository;
  private readonly knowledgeAdapter: IKnowledgeEngineAdapter;
  private readonly clock: IClock;
  private readonly logger: Logger;

  constructor(deps: ITreEngineServiceDependencies) {
    this.pkBoundary = deps.programKerjaBoundaryService;
    this.tradeLibRepo = deps.tradeLibraryRepository;
    this.knowledgeAdapter = deps.knowledgeEngineAdapter;
    this.clock = deps.clock;
    this.logger = deps.logger;
  }

  public async resolveTradeRecommendation(
    ctx: TreResolutionContext
  ): Promise<Result<TradeSelection, BaseAppError>> {
    try {
      this.logger.info('Resolving trade recommendation in TRE', {
        siteDiaryId: ctx.siteDiaryId,
        programmeId: ctx.programmeId,
        revisionId: ctx.revisionId,
        mspTaskId: ctx.mspTaskId,
        timestamp: this.clock.nowIso(),
      });

      // Priority 1: Program Kerja Boundary (formerly raw MSP Resource Assignment)
      if (ctx.mspTaskId && ctx.revisionId) {
        const pkResult = await this.pkBoundary.getProgramKerjaTrade(
          ctx.programmeId,
          ctx.revisionId,
          ctx.mspTaskId
        );
        if (isSuccess(pkResult) && pkResult.value) {
          const pkTrade = pkResult.value;
          this.logger.info('TRE resolved via Priority 1 (Program Kerja Boundary)', {
            tradeCode: pkTrade.tradeCode,
          });
          return Success<TradeSelection>({
            tradeId: pkTrade.tradeId,
            tradeCode: pkTrade.tradeCode,
            tradeName: pkTrade.tradeName,
            tradeCategory: pkTrade.tradeCategory,
            resolutionSource: 'MSP_RESOURCE',
          });
        }
      }

      // Priority 2: Knowledge Recommendation Engine
      const keRecommendation = await this.knowledgeAdapter.getTopRecommendation(ctx);
      if (keRecommendation) {
        this.logger.info('TRE resolved via Priority 2 (Knowledge Engine)', {
          tradeCode: keRecommendation.tradeCode,
        });
        return Success<TradeSelection>({
          tradeId: keRecommendation.recommendedTradeId,
          tradeCode: keRecommendation.tradeCode,
          tradeName: keRecommendation.tradeName,
          tradeCategory: keRecommendation.tradeCategory,
          resolutionSource: 'KNOWLEDGE_ENGINE',
        });
      }

      // Priority 3: Master Trade Library Baseline Fallback
      const defaultTrade = await this.tradeLibRepo.getDefaultTrade();
      if (defaultTrade) {
        this.logger.info('TRE resolved via Priority 3 (Master Trade Library)', {
          tradeCode: defaultTrade.trade_code,
        });
        return Success<TradeSelection>({
          tradeId: defaultTrade.trade_id,
          tradeCode: defaultTrade.trade_code,
          tradeName: defaultTrade.trade_name,
          tradeCategory: defaultTrade.trade_category,
          resolutionSource: 'TRADE_LIBRARY',
        });
      }

      // Fallback: No recommendation found across all sources
      this.logger.warn('TRE resolution failed across all 3 priority tiers', {
        siteDiaryId: ctx.siteDiaryId,
      });
      return Failure(new NoTradeRecommendationFoundError());
    } catch (err: unknown) {
      this.logger.error('Unhandled exception in TRE Engine resolution', { error: err });
      if (err instanceof BaseAppError) {
        return Failure(err);
      }
      return Failure(
        new TreEngineError(err instanceof Error ? err.message : 'TRE resolution failed', {
          cause: err,
        })
      );
    }
  }
}

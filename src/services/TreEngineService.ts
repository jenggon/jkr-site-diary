import { Result, Success, Failure } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { Logger } from '@/lib/logger';
import { IClock } from '@/lib/IClock';
import { TradeSelection, TreResolutionContext } from '@/types/tre';
import { TreEngineError, NoTradeRecommendationFoundError } from '@/errors/treErrors';
import { IMspResourceRepository } from '@/repositories/IMspResourceRepository';
import { ITradeLibraryRepository } from '@/repositories/ITradeLibraryRepository';
import { IKnowledgeEngineAdapter } from '@/services/adapters/IKnowledgeEngineAdapter';
import { ITreEngineService } from './ITreEngineService';

import { IProgramKerjaBoundaryService } from './IProgramKerjaBoundaryService';

export interface ITreEngineServiceDependencies {
  readonly mspResourceRepository?: IMspResourceRepository | undefined;
  readonly programKerjaBoundaryService?: IProgramKerjaBoundaryService | undefined;
  readonly tradeLibraryRepository: ITradeLibraryRepository;
  readonly knowledgeEngineAdapter: IKnowledgeEngineAdapter;
  readonly clock: IClock;
  readonly logger: Logger;
}

/**
 * Trade Recommendation Engine (TRE) Service
 *
 * Enforces immutable 3-tier resolution priority:
 * 1. Priority 1: Program Kerja / MSP Resource Assignment
 * 2. Priority 2: Knowledge Recommendation Engine (IKnowledgeEngineAdapter)
 * 3. Priority 3: Master Trade Library (ITradeLibraryRepository)
 */
export class TreEngineService implements ITreEngineService {
  private readonly mspRepo?: IMspResourceRepository | undefined;
  private readonly pkBoundary?: IProgramKerjaBoundaryService | undefined;
  private readonly tradeLibRepo: ITradeLibraryRepository;
  private readonly knowledgeAdapter: IKnowledgeEngineAdapter;
  private readonly clock: IClock;
  private readonly logger: Logger;

  constructor(deps: ITreEngineServiceDependencies) {
    this.mspRepo = deps.mspResourceRepository;
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
        mspTaskId: ctx.mspTaskId,
        timestamp: this.clock.nowIso(),
      });

      // Priority 1: Program Kerja Boundary / MSP Resource Assignment
      if (ctx.mspTaskId) {
        if (this.pkBoundary) {
          const pkTrade = await this.pkBoundary.getProgramKerjaTrade(
            ctx.programmeId,
            ctx.revisionId ?? '',
            ctx.mspTaskId
          );
          if (pkTrade) {
            this.logger.info('TRE resolved via Priority 1 (Program Kerja Boundary)', {
              tradeCode: pkTrade.tradeCode,
            });
            return Success<TradeSelection>({
              tradeId: pkTrade.tradeId,
              tradeCode: pkTrade.tradeCode,
              tradeName: pkTrade.tradeName,
              tradeCategory: pkTrade.tradeCategory ?? null,
              resolutionSource: 'MSP_RESOURCE',
            });
          }
        } else if (this.mspRepo) {
          const mspResource = await this.mspRepo.findResourceTradeByMspTask(
            ctx.programmeId,
            ctx.mspTaskId
          );
          if (mspResource) {
            this.logger.info('TRE resolved via Priority 1 (MSP Resource)', {
              tradeCode: mspResource.tradeCode,
            });
            return Success<TradeSelection>({
              tradeId: mspResource.resourceId,
              tradeCode: mspResource.tradeCode,
              tradeName: mspResource.tradeName,
              tradeCategory: mspResource.tradeCategory,
              resolutionSource: 'MSP_RESOURCE',
            });
          }
        }
      }

      // Priority 2: Knowledge Recommendation Engine
      const keRecommendations = await this.knowledgeAdapter.getTopRecommendations(ctx);
      if (keRecommendations && keRecommendations.length > 0) {
        const topMatch = keRecommendations[0];
        const alternatives = keRecommendations.slice(1).map((r) => r.tradeName);
        
        if (topMatch) {
          this.logger.info('TRE resolved via Priority 2 (Knowledge Engine)', {
            tradeCode: topMatch.tradeCode,
          });
          const baseSelection = {
            tradeId: topMatch.recommendedTradeId,
            tradeCode: topMatch.tradeCode,
            tradeName: topMatch.tradeName,
            tradeCategory: topMatch.tradeCategory,
            resolutionSource: 'KNOWLEDGE_ENGINE' as const,
          };
          return Success<TradeSelection>(
            alternatives.length > 0 
              ? { ...baseSelection, alternatives }
              : baseSelection
          );
        }
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

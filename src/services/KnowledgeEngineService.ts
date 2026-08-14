import { Result, Success, Failure, isSuccess } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { Logger } from '@/lib/logger';
import { IClock } from '@/lib/IClock';
import {
  KnowledgeRecommendation,
  KnowledgeEvaluationContext,
  KnowledgeEvaluationDiagnostics,
} from '@/types/knowledge';
import { KnowledgeEngineError } from '@/errors/knowledgeErrors';
import { IKnowledgeHistoryRepository } from '@/repositories/KnowledgeHistoryRepository';
import { IKnowledgeEngineService } from './IKnowledgeEngineService';

export interface IKnowledgeEngineServiceDependencies {
  readonly historyRepository: IKnowledgeHistoryRepository;
  readonly clock: IClock;
  readonly logger: Logger;
}

/**
 * Knowledge Recommendation Engine (KRE) Service
 *
 * Enforces:
 * - Deterministic scoring model using: AHI, Subtask, Frequency, Recency.
 * - Returns Top 3 suggestions.
 */
export class KnowledgeEngineService implements IKnowledgeEngineService {
  private readonly historyRepo: IKnowledgeHistoryRepository;
  private readonly clock: IClock;
  private readonly logger: Logger;

  constructor(deps: IKnowledgeEngineServiceDependencies) {
    this.historyRepo = deps.historyRepository;
    this.clock = deps.clock;
    this.logger = deps.logger;
  }

  public async evaluate(
    ctx: KnowledgeEvaluationContext
  ): Promise<Result<KnowledgeRecommendation[], BaseAppError>> {
    const startTime = Date.now();

    try {
      this.logger.info('Evaluating Knowledge Recommendation Engine rules', {
        siteDiaryId: ctx.siteDiaryId,
        programmeId: ctx.programmeId,
        activityName: ctx.activityName,
        timestamp: this.clock.nowIso(),
      });

      if (!ctx.mspTaskId) {
         // Fallback if no MSP Task ID (AHI equivalent) is provided
         return Success([]);
      }

      const historyResult = await this.historyRepo.getHistoryByAhi(ctx.mspTaskId);
      if (!isSuccess(historyResult)) {
         return Failure(historyResult.error);
      }

      const historyData = historyResult.value;

      const score: Record<string, number> = {};
      const frequency: Record<string, number> = {};

      for (const row of historyData) {
        const manpower = row.manpower || [];
        for (const trade of manpower) {
          if (!trade.trade_name) continue;
          
          const name = trade.trade_name;
          if (!frequency[name]) {
            frequency[name] = 0;
          }
          frequency[name]++;

          if (!score[name]) {
            score[name] = 0;
          }

          // 1. AHI Match (Since we queried by AHI, this is a baseline match)
          score[name] += 20;

          // 2. Subtask Match
          if (ctx.subtaskName && row.subtask === ctx.subtaskName) {
            score[name] += 50;
          }

          // 3. Recency Match
          const rowDate = new Date(row.created_at).getTime();
          const now = Date.now();
          const ageDays = (now - rowDate) / (1000 * 60 * 60 * 24);
          score[name] += Math.max(0, 30 - ageDays);
          
          // 4. Frequency Weight
          score[name] += frequency[name] * 15;
        }
      }

      const topTrades = Object.entries(score)
        .sort((a, b) => {
          // Tie-breaking: Frequency descending, then alphabetical
          if (b[1] === a[1]) {
             const freqDiff = (frequency[b[0]] || 0) - (frequency[a[0]] || 0);
             if (freqDiff !== 0) return freqDiff;
             return a[0].localeCompare(b[0]);
          }
          return b[1] - a[1];
        })
        .slice(0, 3);

      const recommendations: KnowledgeRecommendation[] = topTrades.map(([name, finalScore]) => ({
        recommendedTradeId: name,
        tradeCode: name,
        tradeName: name,
        tradeCategory: null,
        reasonCode: 'KNOWLEDGE_HISTORY_MATCH',
        reasonDescription: `Matched historical allocation with score ${finalScore.toFixed(2)} (Freq: ${frequency[name]})`,
        matchedRules: [],
        source: 'KNOWLEDGE_ENGINE',
      }));

      const durationMs = Date.now() - startTime;
      const diagnostics: KnowledgeEvaluationDiagnostics = {
        rulesLoaded: historyData.length,
        rulesEvaluated: historyData.length,
        rulesMatched: topTrades.length,
        selectedRuleId: null,
        selectedRuleVersion: null,
        executionDurationMs: durationMs,
      };

      this.logger.info('KRE evaluation completed', { diagnostics, recommendations });

      return Success(recommendations);
    } catch (err: unknown) {
      this.logger.error('Unhandled exception during Knowledge Engine evaluation', { error: err });
      if (err instanceof BaseAppError) {
        return Failure(err);
      }
      return Failure(
        new KnowledgeEngineError(
          err instanceof Error ? err.message : 'Knowledge evaluation failed',
          { cause: err }
        )
      );
    }
  }
}

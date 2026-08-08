import { isSuccess } from '@/lib/result';
import { KnowledgeTradeRecommendation, TreResolutionContext } from '@/types/tre';
import { IKnowledgeEngineService } from '@/services/IKnowledgeEngineService';
import { createKnowledgeEngineService } from '@/composition/knowledgeComposition';
import { IKnowledgeEngineAdapter } from './IKnowledgeEngineAdapter';

export class KnowledgeEngineAdapter implements IKnowledgeEngineAdapter {
  private readonly knowledgeService: IKnowledgeEngineService;

  constructor(knowledgeService: IKnowledgeEngineService = createKnowledgeEngineService()) {
    this.knowledgeService = knowledgeService;
  }

  public async getTopRecommendation(
    ctx: TreResolutionContext
  ): Promise<KnowledgeTradeRecommendation | null> {
    const result = await this.knowledgeService.evaluate({
      siteDiaryId: ctx.siteDiaryId,
      programmeId: ctx.programmeId,
      mspTaskId: ctx.mspTaskId,
      activityName: ctx.activityName,
      subtaskName: ctx.subtaskName,
    });

    if (isSuccess(result) && result.value !== null) {
      const rec = result.value;
      return {
        recommendedTradeId: rec.recommendedTradeId,
        tradeCode: rec.tradeCode,
        tradeName: rec.tradeName,
        tradeCategory: rec.tradeCategory,
        rank: 1,
      };
    }

    return null;
  }
}

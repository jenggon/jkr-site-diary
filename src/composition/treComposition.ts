import { TreEngineService } from '@/services/TreEngineService';
import { ITreEngineService } from '@/services/ITreEngineService';
import { MspResourceRepository } from '@/repositories/MspResourceRepository';
import { TradeLibraryRepository } from '@/repositories/tradeLibraryRepository';
import { KnowledgeEngineAdapter } from '@/services/adapters/KnowledgeEngineAdapter';
import { SystemClock } from '@/lib/clock';
import { logger } from '@/lib/logger';

/**
 * Composition Root factory for Trade Recommendation Engine (TRE) services.
 * Instantiates TreEngineService using explicit constructor dependency injection.
 * Creates zero global singleton instances.
 */
export function createTreEngineService(): ITreEngineService {
  const mspRepo = new MspResourceRepository();
  const tradeLibRepo = new TradeLibraryRepository();
  const knowledgeAdapter = new KnowledgeEngineAdapter();
  const clock = new SystemClock();

  return new TreEngineService({
    mspResourceRepository: mspRepo,
    tradeLibraryRepository: tradeLibRepo,
    knowledgeEngineAdapter: knowledgeAdapter,
    clock,
    logger,
  });
}

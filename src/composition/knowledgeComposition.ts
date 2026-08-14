import { KnowledgeEngineService } from '@/services/KnowledgeEngineService';
import { IKnowledgeEngineService } from '@/services/IKnowledgeEngineService';
import { KnowledgeHistoryRepository } from '@/repositories/KnowledgeHistoryRepository';
import { SystemClock } from '@/lib/clock';
import { logger } from '@/lib/logger';

/**
 * Composition Root factory for Knowledge Recommendation Engine (KRE) service.
 * Instantiates KnowledgeEngineService using explicit constructor dependency injection.
 * Creates zero global singleton instances.
 */
export function createKnowledgeEngineService(): IKnowledgeEngineService {
  const historyRepo = new KnowledgeHistoryRepository();
  const clock = new SystemClock();

  return new KnowledgeEngineService({
    historyRepository: historyRepo,
    clock,
    logger,
  });
}

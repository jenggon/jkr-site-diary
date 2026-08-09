import { TreEngineService } from '@/services/TreEngineService';
import { ITreEngineService } from '@/services/ITreEngineService';
import { MspResourceRepository } from '@/repositories/MspResourceRepository';
import { TradeLibraryRepository } from '@/repositories/tradeLibraryRepository';
import { KnowledgeEngineAdapter } from '@/services/adapters/KnowledgeEngineAdapter';
import { ProgramKerjaBoundaryService } from '@/services/ProgramKerjaBoundaryService';
import { ProgrammeRevisionRepository } from '@/repositories/ProgrammeRevisionRepository';
import { SystemClock } from '@/lib/clock';
import { logger } from '@/lib/logger';

/**
 * Composition Root factory for Trade Recommendation Engine (TRE) services.
 * Instantiates TreEngineService using explicit constructor dependency injection.
 * Enforces ProgramKerjaBoundaryService as Priority 1 boundary (ADR-011 / D1).
 * Creates zero global singleton instances.
 */
export function createTreEngineService(): ITreEngineService {
  const mspRepo = new MspResourceRepository();
  const revisionRepo = new ProgrammeRevisionRepository();
  const pkBoundary = new ProgramKerjaBoundaryService({
    mspResourceRepository: mspRepo,
    revisionRepository: revisionRepo,
  });
  const tradeLibRepo = new TradeLibraryRepository();
  const knowledgeAdapter = new KnowledgeEngineAdapter();
  const clock = new SystemClock();

  return new TreEngineService({
    programKerjaBoundaryService: pkBoundary,
    tradeLibraryRepository: tradeLibRepo,
    knowledgeEngineAdapter: knowledgeAdapter,
    clock,
    logger,
  });
}

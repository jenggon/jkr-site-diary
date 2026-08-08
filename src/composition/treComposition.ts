import { TreEngineService } from '@/services/TreEngineService';
import { ITreEngineService } from '@/services/ITreEngineService';
import { IProgramKerjaBoundaryService } from '@/services/IProgramKerjaBoundaryService';
import { createProgramKerjaBoundaryService } from '@/composition/programKerjaComposition';
import { TradeLibraryRepository } from '@/repositories/tradeLibraryRepository';
import { KnowledgeEngineAdapter } from '@/services/adapters/KnowledgeEngineAdapter';
import { SystemClock } from '@/lib/clock';
import { logger } from '@/lib/logger';

/**
 * Composition Root factory for Trade Recommendation Engine (TRE) services.
 * Instantiates TreEngineService using explicit constructor dependency injection.
 * Consumes scheduling-derived data through ProgramKerjaBoundaryService.
 */
export function createTreEngineService(
  pkBoundary: IProgramKerjaBoundaryService = createProgramKerjaBoundaryService()
): ITreEngineService {
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

import { IntelligenceOrchestratorService } from '@/services/IntelligenceOrchestratorService';
import { IIntelligenceOrchestratorService } from '@/services/IntelligenceOrchestratorService';
import { createTreEngineService } from './treComposition';
import { createWorkforceEngineService } from './wreComposition';
import { createMaterialEngineService } from './mreComposition';
import { logger } from '@/lib/logger';

export function createIntelligenceOrchestratorService(): IIntelligenceOrchestratorService {
  return new IntelligenceOrchestratorService({
    treEngine: createTreEngineService(),
    workforceEngine: createWorkforceEngineService(),
    materialEngine: createMaterialEngineService(),
    logger,
  });
}

import { IMaterialEngineService } from '@/services/IMaterialEngineService';
import { MaterialEngineService } from '@/services/MaterialEngineService';
import { IProgramKerjaBoundaryService } from '@/services/IProgramKerjaBoundaryService';
import { createProgramKerjaBoundaryService } from '@/composition/programKerjaComposition';
import { ITradeMaterialLibraryRepository } from '@/repositories/ITradeMaterialLibraryRepository';
import { IMaterialRuleRepository } from '@/repositories/IMaterialRuleRepository';
import { MaterialRuleEvaluatorRegistry } from '@/services/evaluators/MaterialRuleEvaluatorRegistry';
import { StandardMaterialEvaluator } from '@/services/evaluators/StandardMaterialEvaluator';
import { SystemClock } from '@/lib/clock';
import { logger } from '@/lib/logger';
import { MaterialItemRecommendation } from '@/types/mre';
import { MaterialRuleData } from '@/repositories/IMaterialRuleRepository';

class MockTradeMaterialLibraryRepository implements ITradeMaterialLibraryRepository {
  public async getMaterialCompositionByTrade(): Promise<readonly MaterialItemRecommendation[] | null> {
    return null;
  }
}

class MockMaterialRuleRepository implements IMaterialRuleRepository {
  public async findActiveRulesByDiscipline(): Promise<readonly MaterialRuleData[]> {
    return [];
  }
}

export function createMaterialEngineService(
  pkBoundary: IProgramKerjaBoundaryService = createProgramKerjaBoundaryService()
): IMaterialEngineService {
  const tradeMaterialLibraryRepository = new MockTradeMaterialLibraryRepository();
  const materialRuleRepository = new MockMaterialRuleRepository();
  
  const evaluatorRegistry = new MaterialRuleEvaluatorRegistry();
  evaluatorRegistry.register(new StandardMaterialEvaluator('CIVIL', materialRuleRepository));
  evaluatorRegistry.register(new StandardMaterialEvaluator('ALL', materialRuleRepository));

  return new MaterialEngineService({
    programKerjaBoundaryService: pkBoundary,
    tradeMaterialLibraryRepository,
    evaluatorRegistry,
    clock: new SystemClock(),
    logger
  });
}

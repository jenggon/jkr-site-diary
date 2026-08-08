import { ProgramKerjaBoundaryService } from '@/services/ProgramKerjaBoundaryService';
import { IProgramKerjaBoundaryService } from '@/services/IProgramKerjaBoundaryService';
import { ProgrammeRevisionRepository } from '@/repositories/ProgrammeRevisionRepository';
import { MspResourceRepository } from '@/repositories/MspResourceRepository';
import { MspWorkforceRepository } from '@/repositories/MspWorkforceRepository';
import { IMspMaterialRepository } from '@/repositories/IMspMaterialRepository';
import { MaterialItemRecommendation } from '@/types/mre';
import { SystemClock } from '@/lib/clock';
import { logger } from '@/lib/logger';

class DefaultMspMaterialRepository implements IMspMaterialRepository {
  public async findMaterialsByMspTask(): Promise<readonly MaterialItemRecommendation[] | null> {
    return null;
  }
}

export function createProgramKerjaBoundaryService(): IProgramKerjaBoundaryService {
  return new ProgramKerjaBoundaryService({
    programmeRevisionRepository: new ProgrammeRevisionRepository(),
    mspResourceRepository: new MspResourceRepository(),
    mspWorkforceRepository: new MspWorkforceRepository(),
    mspMaterialRepository: new DefaultMspMaterialRepository(),
    clock: new SystemClock(),
    logger,
  });
}

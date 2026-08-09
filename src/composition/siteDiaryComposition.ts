import { SiteDiaryService } from '@/services/siteDiaryService';
import { ISiteDiaryService } from '@/services/ISiteDiaryService';
import { ProgrammeRepository } from '@/repositories/ProgrammeRepository';
import { ProgrammeRevisionRepository } from '@/repositories/ProgrammeRevisionRepository';
import { siteDiaryRepository } from '@/repositories/siteDiaryRepository';
import { SystemClock } from '@/lib/clock';
import { Logger } from '@/lib/logger';

/**
 * Composition Root factory for Site Diary Engine service.
 * Instantiates SiteDiaryService using explicit constructor dependency injection.
 * Creates zero global singleton instances.
 */
export function createSiteDiaryService(): ISiteDiaryService {
  return new SiteDiaryService({
    programmeRepository: new ProgrammeRepository(),
    revisionRepository: new ProgrammeRevisionRepository(),
    siteDiaryRepository,
    clock: new SystemClock(),
    logger: new Logger({ module: 'SiteDiaryService' }),
  });
}

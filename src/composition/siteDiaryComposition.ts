import { SiteDiaryService } from '@/services/siteDiaryService';
import { ISiteDiaryService } from '@/services/ISiteDiaryService';
import { ProgrammeRepository } from '@/repositories/ProgrammeRepository';
import { ProgrammeRevisionRepository } from '@/repositories/ProgrammeRevisionRepository';
import { siteDiaryRepository } from '@/repositories/siteDiaryRepository';
import { SystemClock } from '@/lib/clock';
import { Logger } from '@/lib/logger';
import { ResidualAtomicRepository } from '@/repositories/atomic/ResidualAtomicRepository';
import { getSupabaseAuthenticatedClient } from '@/lib/supabase';

/**
 * Composition Root factory for Site Diary Engine service.
 * Instantiates SiteDiaryService using explicit constructor dependency injection.
 * Creates zero global singleton instances.
 */
export function createSiteDiaryService(accessToken?: string): ISiteDiaryService {
  return new SiteDiaryService({
    programmeRepository: new ProgrammeRepository(),
    revisionRepository: new ProgrammeRevisionRepository(),
    siteDiaryRepository,
    clock: new SystemClock(),
    logger: new Logger({ module: 'SiteDiaryService' }),
    ...(accessToken ? { atomicRepository: new ResidualAtomicRepository(getSupabaseAuthenticatedClient(accessToken)) } : {}),
  });
}

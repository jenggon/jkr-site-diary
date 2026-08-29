import { SiteDiaryService } from '@/services/siteDiaryService';
import { ISiteDiaryService } from '@/services/ISiteDiaryService';
import { ProgrammeRepository } from '@/repositories/ProgrammeRepository';
import { ProgrammeRevisionRepository } from '@/repositories/ProgrammeRevisionRepository';
import { ActivityRepository } from '@/repositories/activityRepository';
import { createSiteDiaryRepository } from '@/repositories/siteDiaryRepository';
import { SupabaseDatabaseAdapter } from '@/repositories/adapters/SupabaseDatabaseAdapter';
import { SystemClock } from '@/lib/clock';
import { Logger } from '@/lib/logger';
import { ResidualAtomicRepository } from '@/repositories/atomic/ResidualAtomicRepository';
import { getSupabaseAuthenticatedClient, getSupabaseServerClient } from '@/lib/supabase';

const clock = new SystemClock();
const logger = new Logger({ module: 'SiteDiaryService' });

/**
 * Composition Root factory for Site Diary Engine service.
 * Instantiates SiteDiaryService using explicit constructor dependency injection.
 * Creates zero global singleton instances.
 */
export function createSiteDiaryService(accessToken?: string): ISiteDiaryService {
  const client = accessToken
    ? getSupabaseAuthenticatedClient(accessToken)
    : getSupabaseServerClient();
  const adapter = new SupabaseDatabaseAdapter(client);

  return new SiteDiaryService({
    programmeRepository: new ProgrammeRepository(adapter),
    revisionRepository: new ProgrammeRevisionRepository(adapter),
    activityRepository: new ActivityRepository(adapter),
    siteDiaryRepository: createSiteDiaryRepository(client),
    clock,
    logger,
    ...(accessToken ? { atomicRepository: new ResidualAtomicRepository(client) } : {}),
  });
}

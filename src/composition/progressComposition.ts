import { ProgressService } from '@/services/progressService';
import { IProgressService } from '@/services/IProgressService';
import { ActivityRepository } from '@/repositories/activityRepository';
import { ProgrammeRevisionRepository } from '@/repositories/ProgrammeRevisionRepository';
import { siteDiaryRepository } from '@/repositories/siteDiaryRepository';
import { progressRepository } from '@/repositories/progressRepository';
import { ProgressAtomicRepository } from '@/repositories/atomic/ProgressAtomicRepository';
import { getSupabaseAuthenticatedClient, getSupabaseServerClient } from '@/lib/supabase';
import { SystemClock } from '@/lib/clock';
import { Logger } from '@/lib/logger';

/**
 * Composition Root factory for Progress Engine service.
 * Instantiates ProgressService using explicit constructor dependency injection.
 */
export function createProgressService(accessToken?: string): IProgressService {
  const client = accessToken ? getSupabaseAuthenticatedClient(accessToken) : getSupabaseServerClient();
  return new ProgressService({
    activityRepository: new ActivityRepository(),
    siteDiaryRepository,
    revisionRepository: new ProgrammeRevisionRepository(),
    progressRepository,
    atomicRepository: new ProgressAtomicRepository(client),
    clock: new SystemClock(),
    logger: new Logger({ module: 'ProgressService' }),
  });
}

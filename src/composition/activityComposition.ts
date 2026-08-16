import { OpenActivityService } from '@/services/OpenActivityService';
import { IOpenActivityService } from '@/services/IOpenActivityService';
import { ActivityRepository } from '@/repositories/activityRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { ProgrammeRevisionRepository } from '@/repositories/ProgrammeRevisionRepository';
import { taskRepository } from '@/repositories/taskRepository';
import { DatabaseTransactionManager } from '@/transactions/DatabaseTransactionManager';
import { SystemClock } from '@/lib/clock';
import { logger } from '@/lib/logger';
import { NoopDomainEventPublisher } from '@/events/NoopDomainEventPublisher';
import { ResidualAtomicRepository } from '@/repositories/atomic/ResidualAtomicRepository';
import { getSupabaseAuthenticatedClient } from '@/lib/supabase';

/**
 * Composition Root factory for Open Activities Engine services.
 * Instantiates OpenActivityService using explicit constructor dependency injection.
 * Creates zero global singleton instances.
 */
export function createOpenActivityService(accessToken?: string): IOpenActivityService {
  const activityRepo = new ActivityRepository();
  const logRepo = new ActivityLogRepository();
  const revisionRepo = new ProgrammeRevisionRepository();
  const txManager = new DatabaseTransactionManager();
  const clock = new SystemClock();
  const eventPublisher = new NoopDomainEventPublisher();

  return new OpenActivityService({
    activityRepository: activityRepo,
    logRepository: logRepo,
    transactionManager: txManager,
    clock,
    logger,
    eventPublisher,
    // REM-004: Wire revision repository so assertRevisionOperational() enforces
    // revision lifecycle validity on every mutation path in production.
    revisionRepository: revisionRepo,
    taskRepository: taskRepository,
    ...(accessToken ? { atomicRepository: new ResidualAtomicRepository(getSupabaseAuthenticatedClient(accessToken)) } : {}),
  });
}

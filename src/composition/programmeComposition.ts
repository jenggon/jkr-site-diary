import { ProgrammeService } from '@/services/ProgrammeService';
import { IProgrammeService } from '@/services/IProgrammeService';
import { ProgrammeRepository } from '@/repositories/ProgrammeRepository';
import { ProgrammeRevisionRepository } from '@/repositories/ProgrammeRevisionRepository';
import { DatabaseTransactionManager } from '@/transactions/DatabaseTransactionManager';
import { SystemClock } from '@/lib/clock';
import { logger } from '@/lib/logger';
import { SyncDomainEventPublisher } from '@/events/SyncDomainEventPublisher';
import { OpenActivityTerminationHandler } from '@/events/handlers/OpenActivityTerminationHandler';
import { ActivityRepository } from '@/repositories/activityRepository';
import { IDomainEventPublisher, IDomainEvent } from '@/events/IDomainEventPublisher';
import { IActivityRepository } from '@/repositories/IActivityRepository';
import { ResidualAtomicRepository } from '@/repositories/atomic/ResidualAtomicRepository';
import { SupabaseDatabaseAdapter } from '@/repositories/adapters/SupabaseDatabaseAdapter';
import { getSupabaseAuthenticatedClient } from '@/lib/supabase';

export interface CreateProgrammeServiceOptions {
  readonly eventPublisher?: IDomainEventPublisher;
  readonly activityRepository?: IActivityRepository;
  readonly accessToken?: string;
}

/**
 * Composition Root factory for Programme Engine services.
 * Instantiates ProgrammeService using explicit constructor dependency injection.
 * Registers OpenActivityTerminationHandler with SyncDomainEventPublisher.
 */
export function createProgrammeService(options?: CreateProgrammeServiceOptions): IProgrammeService {
  const authenticatedClient = options?.accessToken
    ? getSupabaseAuthenticatedClient(options.accessToken)
    : undefined;
  const programmeRepo = authenticatedClient
    ? new ProgrammeRepository(new SupabaseDatabaseAdapter(authenticatedClient))
    : new ProgrammeRepository();
  const revisionRepo = new ProgrammeRevisionRepository();
  const txManager = new DatabaseTransactionManager();
  const clock = new SystemClock();

  let publisher = options?.eventPublisher;
  if (!publisher) {
    const syncPublisher = new SyncDomainEventPublisher();
    const activityRepo = options?.activityRepository ?? new ActivityRepository();
    const terminationHandler = new OpenActivityTerminationHandler({
      activityRepository: activityRepo,
      logger,
    });
    syncPublisher.subscribe('PROGRAMME_REVISION_APPROVED', (evt: IDomainEvent) =>
      terminationHandler.handle(evt),
    );
    publisher = syncPublisher;
  }

  return new ProgrammeService({
    programmeRepository: programmeRepo,
    revisionRepository: revisionRepo,
    transactionManager: txManager,
    clock,
    logger,
    eventPublisher: publisher,
    ...(authenticatedClient
      ? { atomicRepository: new ResidualAtomicRepository(authenticatedClient) }
      : {}),
  });
}

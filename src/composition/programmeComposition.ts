import { ProgrammeService } from '@/services/ProgrammeService';
import { IProgrammeService } from '@/services/IProgrammeService';
import { ProgrammeRepository } from '@/repositories/ProgrammeRepository';
import { ProgrammeRevisionRepository } from '@/repositories/ProgrammeRevisionRepository';
import { DatabaseTransactionManager } from '@/transactions/DatabaseTransactionManager';
import { SystemClock } from '@/lib/clock';
import { logger } from '@/lib/logger';
import { SyncDomainEventPublisher } from '@/events/SyncDomainEventPublisher';
import { OpenActivityTerminationHandler } from '@/events/handlers/OpenActivityTerminationHandler';
import { OpenActivityRepository } from '@/repositories/OpenActivityRepository';
import { IDomainEventPublisher, IDomainEvent } from '@/events/IDomainEventPublisher';
import { IOpenActivityRepository } from '@/repositories/IOpenActivityRepository';

export interface CreateProgrammeServiceOptions {
  readonly eventPublisher?: IDomainEventPublisher;
  readonly activityRepository?: IOpenActivityRepository;
}

/**
 * Composition Root factory for Programme Engine services.
 * Instantiates ProgrammeService using explicit constructor dependency injection.
 * Registers OpenActivityTerminationHandler with SyncDomainEventPublisher.
 */
export function createProgrammeService(options?: CreateProgrammeServiceOptions): IProgrammeService {
  const programmeRepo = new ProgrammeRepository();
  const revisionRepo = new ProgrammeRevisionRepository();
  const txManager = new DatabaseTransactionManager();
  const clock = new SystemClock();

  let publisher = options?.eventPublisher;
  if (!publisher) {
    const syncPublisher = new SyncDomainEventPublisher();
    const activityRepo = options?.activityRepository ?? new OpenActivityRepository();
    const terminationHandler = new OpenActivityTerminationHandler({
      activityRepository: activityRepo,
      logger,
    });
    syncPublisher.subscribe('PROGRAMME_REVISION_APPROVED', (evt: IDomainEvent) => terminationHandler.handle(evt));
    publisher = syncPublisher;
  }

  return new ProgrammeService({
    programmeRepository: programmeRepo,
    revisionRepository: revisionRepo,
    transactionManager: txManager,
    clock,
    logger,
    eventPublisher: publisher,
  });
}

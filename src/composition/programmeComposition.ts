import { ProgrammeService } from '@/services/ProgrammeService';
import { IProgrammeService } from '@/services/IProgrammeService';
import { ProgrammeRepository } from '@/repositories/ProgrammeRepository';
import { ProgrammeRevisionRepository } from '@/repositories/ProgrammeRevisionRepository';
import { DatabaseTransactionManager } from '@/transactions/DatabaseTransactionManager';
import { SystemClock } from '@/lib/clock';
import { logger } from '@/lib/logger';
import { NoopDomainEventPublisher } from '@/events/NoopDomainEventPublisher';

/**
 * Composition Root factory for Programme Engine services.
 * Instantiates ProgrammeService using explicit constructor dependency injection.
 * Creates zero global singleton instances.
 */
export function createProgrammeService(): IProgrammeService {
  const programmeRepo = new ProgrammeRepository();
  const revisionRepo = new ProgrammeRevisionRepository();
  const txManager = new DatabaseTransactionManager();
  const clock = new SystemClock();
  const eventPublisher = new NoopDomainEventPublisher();

  return new ProgrammeService({
    programmeRepository: programmeRepo,
    revisionRepository: revisionRepo,
    transactionManager: txManager,
    clock,
    logger,
    eventPublisher,
  });
}

import { OpenActivityService } from '@/services/OpenActivityService';
import { IOpenActivityService } from '@/services/IOpenActivityService';
import { OpenActivityRepository } from '@/repositories/OpenActivityRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { DatabaseTransactionManager } from '@/transactions/DatabaseTransactionManager';
import { SystemClock } from '@/lib/clock';
import { logger } from '@/lib/logger';
import { NoopDomainEventPublisher } from '@/events/NoopDomainEventPublisher';

/**
 * Composition Root factory for Open Activities Engine services.
 * Instantiates OpenActivityService using explicit constructor dependency injection.
 * Creates zero global singleton instances.
 */
export function createOpenActivityService(): IOpenActivityService {
  const activityRepo = new OpenActivityRepository();
  const logRepo = new ActivityLogRepository();
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
  });
}

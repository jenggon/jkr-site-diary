import { ProgressService } from '@/services/progressService';
import { IProgressService } from '@/services/IProgressService';
import { ActivityRepository } from '@/repositories/activityRepository';
import { ProgrammeRevisionRepository } from '@/repositories/ProgrammeRevisionRepository';
import { siteDiaryRepository } from '@/repositories/siteDiaryRepository';
import { progressRepository } from '@/repositories/progressRepository';
import { auditRepository } from '@/repositories/auditRepository';
import { DatabaseTransactionManager } from '@/transactions/DatabaseTransactionManager';
import { createOpenActivityService } from '@/composition/activityComposition';
import { SystemClock } from '@/lib/clock';
import { Logger } from '@/lib/logger';

/**
 * Composition Root factory for Progress Engine service.
 * Instantiates ProgressService using explicit constructor dependency injection.
 */
export function createProgressService(): IProgressService {
  return new ProgressService({
    activityRepository: new ActivityRepository(),
    siteDiaryRepository,
    revisionRepository: new ProgrammeRevisionRepository(),
    progressRepository,
    auditRepository,
    transactionManager: new DatabaseTransactionManager(),
    openActivityService: createOpenActivityService(),
    clock: new SystemClock(),
    logger: new Logger({ module: 'ProgressService' }),
  });
}

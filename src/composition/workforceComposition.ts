import { WorkforceService } from '@/services/workforceService';
import { siteDiaryRepository } from '@/repositories/siteDiaryRepository';
import { ProgrammeRevisionRepository } from '@/repositories/ProgrammeRevisionRepository';
import { TradeLibraryRepository } from '@/repositories/tradeLibraryRepository';
import { workforceRepository } from '@/repositories/workforceRepository';
import { auditRepository } from '@/repositories/auditRepository';
import { DatabaseTransactionManager } from '@/transactions/DatabaseTransactionManager';
import { SystemClock } from '@/lib/clock';
import { Logger } from '@/lib/logger';

const revisionRepository = new ProgrammeRevisionRepository();
const tradeLibraryRepository = new TradeLibraryRepository();
const transactionManager = new DatabaseTransactionManager();
const clock = new SystemClock();
const logger = new Logger({ module: 'WorkforceEngine' });

export const workforceService = new WorkforceService({
  siteDiaryRepository,
  revisionRepository,
  tradeLibraryRepository,
  workforceRepository,
  auditRepository,
  transactionManager,
  clock,
  logger,
});

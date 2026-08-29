import { WorkforceService } from '@/services/workforceService';
import { siteDiaryRepository } from '@/repositories/siteDiaryRepository';
import { ProgrammeRevisionRepository } from '@/repositories/ProgrammeRevisionRepository';
import { TradeLibraryRepository } from '@/repositories/tradeLibraryRepository';
import { workforceRepository } from '@/repositories/workforceRepository';
import { auditRepository } from '@/repositories/auditRepository';
import { DatabaseTransactionManager } from '@/transactions/DatabaseTransactionManager';
import { SystemClock } from '@/lib/clock';
import { Logger } from '@/lib/logger';
import { ResidualAtomicRepository } from '@/repositories/atomic/ResidualAtomicRepository';
import { getSupabaseAuthenticatedClient } from '@/lib/supabase';

const revisionRepository = new ProgrammeRevisionRepository();
const tradeLibraryRepository = new TradeLibraryRepository();
const transactionManager = new DatabaseTransactionManager();
const clock = new SystemClock();
const logger = new Logger({ module: 'WorkforceEngine' });

export function createWorkforceService(accessToken?: string): WorkforceService {
  return new WorkforceService({
    siteDiaryRepository,
    revisionRepository,
    tradeLibraryRepository,
    workforceRepository,
    auditRepository,
    transactionManager,
    clock,
    logger,
    ...(accessToken ? { atomicRepository: new ResidualAtomicRepository(getSupabaseAuthenticatedClient(accessToken)) } : {}),
  });
}

export const workforceService = createWorkforceService();

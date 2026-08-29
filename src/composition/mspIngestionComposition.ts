import { MspIngestionService } from '@/services/MspIngestionService';
import { IMspIngestionService } from '@/services/IMspIngestionService';
import { ProgrammeRepository } from '@/repositories/ProgrammeRepository';
import { ProgrammeRevisionRepository } from '@/repositories/ProgrammeRevisionRepository';
import { DatabaseTransactionManager } from '@/transactions/DatabaseTransactionManager';
import { MspXmlParser } from '@/services/MspXmlParser';
import { SystemClock } from '@/lib/clock';
import { Logger } from '@/lib/logger';
import { bulkCreateTasks } from '@/repositories/taskRepository';
import { ResidualAtomicRepository } from '@/repositories/atomic/ResidualAtomicRepository';
import { getSupabaseAuthenticatedClient } from '@/lib/supabase';

export function createMspIngestionService(accessToken?: string): IMspIngestionService {
  return new MspIngestionService({
    programmeRepository: new ProgrammeRepository(),
    revisionRepository: new ProgrammeRevisionRepository(),
    transactionManager: new DatabaseTransactionManager(),
    xmlParser: new MspXmlParser(),
    clock: new SystemClock(),
    logger: new Logger({ module: 'MspIngestionService' }),
    bulkCreateTasksFn: bulkCreateTasks,
    ...(accessToken ? { atomicRepository: new ResidualAtomicRepository(getSupabaseAuthenticatedClient(accessToken)) } : {}),
  });
}

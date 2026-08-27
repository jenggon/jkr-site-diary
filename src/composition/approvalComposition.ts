import { ApprovalService } from '@/services/approvalService';
import { IApprovalService } from '@/services/IApprovalService';
import { ProgrammeRevisionRepository } from '@/repositories/ProgrammeRevisionRepository';
import { ActivityRepository } from '@/repositories/activityRepository';
import { createSiteDiaryRepository } from '@/repositories/siteDiaryRepository';
import { createProgressRepository } from '@/repositories/progressRepository';
import { createApprovalRepository } from '@/repositories/approvalRepository';
import { SupabaseDatabaseAdapter } from '@/repositories/adapters/SupabaseDatabaseAdapter';
import { ApprovalAtomicRepository } from '@/repositories/atomic/ApprovalAtomicRepository';
import { ApprovalQueueReadRepository } from '@/repositories/ApprovalQueueReadRepository';
import { ApprovalReviewReadRepository } from '@/repositories/ApprovalReviewReadRepository';
import { getSupabaseAuthenticatedClient, getSupabaseServerClient } from '@/lib/supabase';
import { SystemClock } from '@/lib/clock';
import { Logger } from '@/lib/logger';

const clock = new SystemClock();
const logger = new Logger({ module: 'ApprovalEngine' });

export function createApprovalService(accessToken?: string): IApprovalService {
  const client = accessToken ? getSupabaseAuthenticatedClient(accessToken) : getSupabaseServerClient();
  const adapter = new SupabaseDatabaseAdapter(client);

  return new ApprovalService({
    revisionRepository: new ProgrammeRevisionRepository(adapter),
    activityRepository: new ActivityRepository(adapter),
    siteDiaryRepository: createSiteDiaryRepository(client),
    progressRepository: createProgressRepository(client),
    approvalRepository: createApprovalRepository(client),
    atomicRepository: new ApprovalAtomicRepository(client),
    clock,
    logger,
  });
}

export function createApprovalQueueRepository(accessToken?: string): ApprovalQueueReadRepository {
  const client = accessToken ? getSupabaseAuthenticatedClient(accessToken) : getSupabaseServerClient();
  return new ApprovalQueueReadRepository(client);
}

export function createApprovalReviewRepository(accessToken: string): ApprovalReviewReadRepository {
  return new ApprovalReviewReadRepository(getSupabaseAuthenticatedClient(accessToken));
}

export const approvalService: IApprovalService = createApprovalService();

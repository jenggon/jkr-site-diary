import { ApprovalService } from '@/services/approvalService';
import { IApprovalService } from '@/services/IApprovalService';
import { ProgrammeRevisionRepository } from '@/repositories/ProgrammeRevisionRepository';
import { ActivityRepository } from '@/repositories/activityRepository';
import { siteDiaryRepository } from '@/repositories/siteDiaryRepository';
import { progressRepository } from '@/repositories/progressRepository';
import { approvalRepository } from '@/repositories/approvalRepository';
import { ApprovalAtomicRepository } from '@/repositories/atomic/ApprovalAtomicRepository';
import { ApprovalQueueReadRepository } from '@/repositories/ApprovalQueueReadRepository';
import { ApprovalReviewReadRepository } from '@/repositories/ApprovalReviewReadRepository';
import { getSupabaseAuthenticatedClient, getSupabaseServerClient } from '@/lib/supabase';
import { SystemClock } from '@/lib/clock';
import { Logger } from '@/lib/logger';

const revisionRepository = new ProgrammeRevisionRepository();
const activityRepository = new ActivityRepository();
const clock = new SystemClock();
const logger = new Logger({ module: 'ApprovalEngine' });

export function createApprovalService(accessToken?: string): IApprovalService {
  const client = accessToken ? getSupabaseAuthenticatedClient(accessToken) : getSupabaseServerClient();
  return new ApprovalService({
    revisionRepository,
    activityRepository,
    siteDiaryRepository,
    progressRepository,
    approvalRepository,
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

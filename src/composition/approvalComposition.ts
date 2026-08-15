import { ApprovalService } from '@/services/approvalService';
import { IApprovalService } from '@/services/IApprovalService';
import { ProgrammeRevisionRepository } from '@/repositories/ProgrammeRevisionRepository';
import { ActivityRepository } from '@/repositories/activityRepository';
import { siteDiaryRepository } from '@/repositories/siteDiaryRepository';
import { progressRepository } from '@/repositories/progressRepository';
import { approvalRepository } from '@/repositories/approvalRepository';
import { auditRepository } from '@/repositories/auditRepository';
import { DatabaseTransactionManager } from '@/transactions/DatabaseTransactionManager';
import { SystemClock } from '@/lib/clock';
import { Logger } from '@/lib/logger';

const revisionRepository = new ProgrammeRevisionRepository();
const activityRepository = new ActivityRepository();
const transactionManager = new DatabaseTransactionManager();
const clock = new SystemClock();
const logger = new Logger({ module: 'ApprovalEngine' });

export const approvalService: IApprovalService = new ApprovalService({
  revisionRepository,
  activityRepository,
  siteDiaryRepository,
  progressRepository,
  approvalRepository,
  auditRepository,
  transactionManager,
  clock,
  logger,
});

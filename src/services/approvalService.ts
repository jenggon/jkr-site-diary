import { Approval, ApprovalStatus } from '@/types/approval';
import { approvalRepository } from '@/repositories/approvalRepository';

/**
 * Approval Engine Business Service
 *
 * Specs: DB-020 (approval)
 * ADRs: ADR-009, ADR-010
 * Domain Models: DM-009
 *
 * Responsible for Approval Engine business orchestration, workflow defaults,
 * and audit metadata population.
 * Operates strictly through approvalRepository and performs no direct database or infrastructure operations.
 */

/**
 * Create a new Approval workflow request.
 * Populates created_at audit metadata, requested_at timestamp, and default approval_status = Pending before persistence.
 *
 * Specs: DB-020, DM-009
 */
export async function createApproval(
  data: Omit<Approval, 'approval_id' | 'created_at'> & {
    approval_id?: string;
    created_at?: string;
  }
): Promise<Approval> {
  const createdAt = new Date().toISOString();
  const requestedAt = data.requested_at || createdAt;
  const approvalStatus = data.approval_status || ApprovalStatus.Pending;

  return approvalRepository.createApproval({
    ...data,
    requested_at: requestedAt,
    approval_status: approvalStatus,
    created_at: createdAt,
  });
}

/**
 * Retrieve an Approval record by its ID.
 * Delegates persistence to approvalRepository.
 *
 * Specs: DB-020
 */
export async function getApprovalById(approvalId: string): Promise<Approval | null> {
  return approvalRepository.getApprovalById(approvalId);
}

/**
 * Retrieve all Approval records belonging to an Activity.
 * Delegates persistence to approvalRepository.
 *
 * Specs: DB-020
 */
export async function getApprovalsByActivity(activityId: string): Promise<Approval[]> {
  return approvalRepository.getApprovalsByActivity(activityId);
}

/**
 * Retrieve all Approval records belonging to a Site Diary entry.
 * Delegates persistence to approvalRepository.
 *
 * Specs: DB-020
 */
export async function getApprovalsBySiteDiary(siteDiaryId: string): Promise<Approval[]> {
  return approvalRepository.getApprovalsBySiteDiary(siteDiaryId);
}

/**
 * Retrieve all Approval records belonging to a Progress measurement record.
 * Delegates persistence to approvalRepository.
 *
 * Specs: DB-020
 */
export async function getApprovalsByProgress(progressId: string): Promise<Approval[]> {
  return approvalRepository.getApprovalsByProgress(progressId);
}

/**
 * NOTE
 *
 * Atomic execution is required by ADR-010 where business operations require it.
 *
 * The Infrastructure layer is responsible for providing the
 * required atomic execution mechanism during a future
 * implementation task.
 *
 * This Service intentionally contains no infrastructure logic.
 */
export async function updateApproval(
  approvalId: string,
  updates: Partial<Approval>
): Promise<Approval> {
  // NOTE:
  // ADR-010 requires this business operation to execute atomically.
  // The Infrastructure layer will provide the required implementation.
  // This Service intentionally performs business orchestration only.
  const updatedAt = new Date().toISOString();

  return approvalRepository.updateApproval(approvalId, {
    ...updates,
    updated_at: updatedAt,
  });
}

export const approvalService = {
  createApproval,
  getApprovalById,
  getApprovalsByActivity,
  getApprovalsBySiteDiary,
  getApprovalsByProgress,
  updateApproval,
};

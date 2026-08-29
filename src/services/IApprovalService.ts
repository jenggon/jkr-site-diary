import { Result } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { Approval, ApprovalStatus } from '@/types/approval';

export interface CreateApprovalCommand {
  programme_id: string;
  revision_id: string;
  activity_id: string;
  site_diary_id?: string | null;
  progress_id?: string | null;
  approval_level?: number;
  requested_by: string;
  requested_at?: string;
  approval_comment?: string | null;
  expected_site_diary_last_modified_at?: string;
}

export interface UpdateApprovalCommand {
  approval_status: ApprovalStatus;
  approved_by?: string | null;
  approval_date?: string | null;
  approval_comment?: string | null;
  expected_site_diary_last_modified_at?: string;
}

export interface IApprovalService {
  createApproval(cmd: CreateApprovalCommand): Promise<Result<Approval, BaseAppError>>;
  getApprovalById(approvalId: string): Promise<Result<Approval | null, BaseAppError>>;
  getApprovalsByActivity(activityId: string): Promise<Result<Approval[], BaseAppError>>;
  getApprovalsBySiteDiary(siteDiaryId: string): Promise<Result<Approval[], BaseAppError>>;
  getApprovalsByProgress(progressId: string): Promise<Result<Approval[], BaseAppError>>;
  updateApproval(approvalId: string, cmd: UpdateApprovalCommand): Promise<Result<Approval, BaseAppError>>;
}

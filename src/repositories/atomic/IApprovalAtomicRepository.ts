import { Approval } from '@/types/approval';

export interface IApprovalAtomicRepository {
  create(payload: Record<string, unknown>, actorId: string, expectedSiteDiaryLastModifiedAt?: string): Promise<Approval>;
  update(approvalId: string, payload: Record<string, unknown>, actorId: string, expectedSiteDiaryLastModifiedAt?: string): Promise<Approval>;
}

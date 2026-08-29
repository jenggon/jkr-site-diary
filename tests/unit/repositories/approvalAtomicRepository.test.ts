import { describe, it, expect, vi } from 'vitest';
import { ApprovalAtomicRepository } from '@/repositories/atomic/ApprovalAtomicRepository';
import {
  ApprovalStaleSiteDiaryError,
  ApprovalContextChangedError,
  ApprovalTerminalStateError,
  ApprovalNotFoundError,
  ApprovalValidationError,
  ApprovalPendingExistsError,
  ApprovalApprovedExistsError,
  ApprovalReturnedRequiresResubmissionError,
  ApprovalTransitionConflictError,
} from '@/errors/approvalErrors';
import { SiteDiaryNotFoundError } from '@/errors/siteDiaryErrors';
import { AuthorizationError } from '@/lib/errors';

describe('ApprovalAtomicRepository Error Preservation', () => {
  const createMockClient = (rpcFn: (name: string, args: Record<string, unknown>) => Promise<unknown>) => ({
    rpc: vi.fn(rpcFn),
  });

  it('preserves DB PT409 identity for F24_SITE_DIARY_STALE and maps to ApprovalStaleSiteDiaryError (409)', async () => {
    const client = createMockClient(async () => ({
      data: null,
      error: { code: 'PT409', message: 'F24_SITE_DIARY_STALE' },
    }));
    const repo = new ApprovalAtomicRepository(client as never);

    await expect(
      repo.create(
        { programme_id: 'p1', revision_id: 'r1', activity_id: 'a1', site_diary_id: 'sd1' },
        'actor-1',
        '2026-08-18T00:00:00.000Z'
      )
    ).rejects.toBeInstanceOf(ApprovalStaleSiteDiaryError);

    await expect(
      repo.update(
        'appr-1',
        { approval_status: 'Approved' },
        'actor-1',
        '2026-08-18T00:00:00.000Z'
      )
    ).rejects.toBeInstanceOf(ApprovalStaleSiteDiaryError);
  });

  it('preserves DB PT409 identity for F24_APPROVAL_CONTEXT_CHANGED and maps to ApprovalContextChangedError (409)', async () => {
    const client = createMockClient(async () => ({
      data: null,
      error: { code: 'PT409', message: 'F24_APPROVAL_CONTEXT_CHANGED' },
    }));
    const repo = new ApprovalAtomicRepository(client as never);

    await expect(
      repo.update(
        'appr-1',
        { approval_status: 'Approved' },
        'actor-1',
        '2026-08-18T00:00:00.000Z'
      )
    ).rejects.toBeInstanceOf(ApprovalContextChangedError);
  });

  it('preserves DB terminal state error and maps to ApprovalTerminalStateError (409)', async () => {
    const client = createMockClient(async () => ({
      data: null,
      error: { code: '23514', message: 'A27_APPROVAL_TERMINAL_STATE' },
    }));
    const repo = new ApprovalAtomicRepository(client as never);

    await expect(
      repo.update(
        'appr-1',
        { approval_status: 'Approved' },
        'actor-1',
        '2026-08-18T00:00:00.000Z'
      )
    ).rejects.toBeInstanceOf(ApprovalTerminalStateError);
  });

  it('preserves DB not-found errors accurately', async () => {
    const clientApprNotFound = createMockClient(async () => ({
      data: null,
      error: { code: 'P0001', message: 'A27_APPROVAL_NOT_FOUND' },
    }));
    const repoAppr = new ApprovalAtomicRepository(clientApprNotFound as never);

    await expect(
      repoAppr.update('appr-1', { approval_status: 'Approved' }, 'actor-1', '2026-08-18T00:00:00.000Z')
    ).rejects.toBeInstanceOf(ApprovalNotFoundError);

    const clientSdNotFound = createMockClient(async () => ({
      data: null,
      error: { code: 'P0001', message: 'A27_SITE_DIARY_NOT_FOUND' },
    }));
    const repoSd = new ApprovalAtomicRepository(clientSdNotFound as never);

    await expect(
      repoSd.create(
        { programme_id: 'p1', revision_id: 'r1', activity_id: 'a1', site_diary_id: 'sd1' },
        'actor-1',
        '2026-08-18T00:00:00.000Z'
      )
    ).rejects.toBeInstanceOf(SiteDiaryNotFoundError);
  });

  it('preserves DB missing token error as ApprovalValidationError (400)', async () => {
    const client = createMockClient(async () => ({
      data: null,
      error: { code: '22007', message: 'F24_EXPECTED_LAST_MODIFIED_REQUIRED' },
    }));
    const repo = new ApprovalAtomicRepository(client as never);

    await expect(
      repo.create(
        { programme_id: 'p1', revision_id: 'r1', activity_id: 'a1', site_diary_id: 'sd1' },
        'actor-1',
        undefined
      )
    ).rejects.toBeInstanceOf(ApprovalValidationError);
  });

  it('does NOT classify unexpected DB error as conflict (throws generic Error)', async () => {
    const client = createMockClient(async () => ({
      data: null,
      error: { code: 'XX000', message: 'Internal DB engine failure' },
    }));
    const repo = new ApprovalAtomicRepository(client as never);

    await expect(
      repo.update(
        'appr-1',
        { approval_status: 'Approved' },
        'actor-1',
        '2026-08-18T00:00:00.000Z'
      )
    ).rejects.toThrow('a27_update_approval_atomic failed: Internal DB engine failure');
  });

  it.each([
    ['F24_PENDING_APPROVAL_EXISTS', ApprovalPendingExistsError],
    ['F24_APPROVED_APPROVAL_EXISTS', ApprovalApprovedExistsError],
    ['F24_RETURNED_APPROVAL_REQUIRES_RESUBMISSION', ApprovalReturnedRequiresResubmissionError],
    ['F24_APPROVAL_TRANSITION_INVALID', ApprovalTransitionConflictError],
  ])('maps structured PT409 %s without broad message matching', async (message, ErrorType) => {
    const client = createMockClient(async () => ({
      data: null,
      error: { code: 'PT409', message },
    }));
    const repo = new ApprovalAtomicRepository(client as never);

    await expect(
      repo.update('appr-1', { approval_status: 'Pending' }, 'actor-1', '2026-08-18T00:00:00.000Z')
    ).rejects.toBeInstanceOf(ErrorType);
  });

  it('maps PT403 capability denial to AuthorizationError', async () => {
    const client = createMockClient(async () => ({
      data: null,
      error: { code: 'PT403', message: 'F24_UNAUTHORIZED_CAPABILITY' },
    }));
    const repo = new ApprovalAtomicRepository(client as never);

    await expect(
      repo.update('appr-1', { approval_status: 'Approved' }, 'actor-1', '2026-08-18T00:00:00.000Z')
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

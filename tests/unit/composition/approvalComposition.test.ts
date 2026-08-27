import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import { createApprovalService, approvalService } from '@/composition/approvalComposition';
import {
  siteDiaryRepository,
  createSiteDiaryRepository,
  getSiteDiaryById,
} from '@/repositories/siteDiaryRepository';
import {
  progressRepository,
  createProgressRepository,
  getProgressById,
} from '@/repositories/progressRepository';
import {
  approvalRepository,
  createApprovalRepository,
  getApprovalById,
} from '@/repositories/approvalRepository';
import { ApprovalStatus } from '@/types/approval';
import { isFailure, isSuccess } from '@/lib/result';

const mockFrom = vi.fn();
const mockRpc = vi.fn();

const mockAuthenticatedClient = {
  from: mockFrom,
  rpc: mockRpc,
} as unknown as SupabaseClient;

vi.mock('@/lib/supabase', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/supabase')>();
  return {
    ...original,
    getSupabaseAuthenticatedClient: vi.fn((_token: string) => mockAuthenticatedClient),
  };
});

describe('Approval Composition & Request-Scoped Authentication (C09-B)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('A. Request-scoped client injection', () => {
    it('gives all prerequisite repositories the caller-authenticated client rather than the default anon client', async () => {
      const token = 'caller-session-token-xyz';
      const service = createApprovalService(token) as unknown as {
        revisionRepo: { adapter: { client: SupabaseClient } };
        activityRepo: { adapter: { client: SupabaseClient } };
        siteDiaryRepo: { getSiteDiaryById: (id: string) => Promise<unknown> };
        progressRepo: { getProgressById: (id: string) => Promise<unknown> };
        approvalRepo: { getApprovalById: (id: string) => Promise<unknown> };
        atomicRepo: { client: SupabaseClient };
      };

      // 1. Adapter client check for ProgrammeRevisionRepository and ActivityRepository
      expect(service.revisionRepo.adapter.client).toBe(mockAuthenticatedClient);
      expect(service.activityRepo.adapter.client).toBe(mockAuthenticatedClient);
      expect(service.atomicRepo.client).toBe(mockAuthenticatedClient);

      // 2. Client-bound factory check for siteDiaryRepo
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      await service.siteDiaryRepo.getSiteDiaryById('sd-1');
      expect(mockFrom).toHaveBeenCalledWith('site_diary');

      // 3. Client-bound factory check for progressRepo
      await service.progressRepo.getProgressById('prog-1');
      expect(mockFrom).toHaveBeenCalledWith('progress');

      // 4. Client-bound factory check for approvalRepo
      await service.approvalRepo.getApprovalById('appr-1');
      expect(mockFrom).toHaveBeenCalledWith('approval');
    });
  });

  describe('B. POST prerequisite chain reaches atomic repository on valid context', () => {
    it('executes full prerequisite read chain on authenticated client and triggers atomic RPC', async () => {
      const service = createApprovalService('caller-token');

      // Setup mock query responses for prerequisite checks
      mockFrom.mockImplementation((table: string) => {
        if (table === 'programme_revision') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    revision_id: 'rev-valid',
                    programme_id: 'prog-1',
                    revision_no: 1,
                    status: 'Approved',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'programme') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { programme_id: 'prog-1', current_revision_id: 'rev-valid' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'activity') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    activity_id: 'act-1',
                    programme_id: 'prog-1',
                    revision_id: 'rev-valid',
                    status: 'New',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'site_diary') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    site_diary_id: 'sd-1',
                    activity_id: 'act-1',
                    revision_id: 'rev-valid',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      mockRpc.mockResolvedValue({
        data: {
          approval_id: 'appr-created-1',
          programme_id: 'prog-1',
          revision_id: 'rev-valid',
          activity_id: 'act-1',
          site_diary_id: 'sd-1',
          approval_status: ApprovalStatus.Pending,
        },
        error: null,
      });

      const result = await service.createApproval({
        programme_id: 'prog-1',
        revision_id: 'rev-valid',
        activity_id: 'act-1',
        site_diary_id: 'sd-1',
        requested_by: 'caller-actor-id',
        expected_site_diary_last_modified_at: '2026-08-20T00:00:00.000Z',
      });

      expect(isSuccess(result)).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith(
        'a27_create_approval_atomic',
        expect.objectContaining({
          p_actor_id: 'caller-actor-id',
          p_expected_sd_last_modified_at: '2026-08-20T00:00:00.000Z',
        })
      );
    });

    it('halts and denies before atomic RPC if revision is not Approved', async () => {
      const service = createApprovalService('caller-token');

      mockFrom.mockImplementation((table: string) => {
        if (table === 'programme_revision') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    revision_id: 'rev-draft',
                    programme_id: 'prog-1',
                    revision_no: 1,
                    status: 'Draft',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'programme') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { programme_id: 'prog-1', current_revision_id: 'rev-draft' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      const result = await service.createApproval({
        programme_id: 'prog-1',
        revision_id: 'rev-draft',
        activity_id: 'act-1',
        requested_by: 'caller-actor-id',
      });

      expect(isFailure(result)).toBe(true);
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe('C. PATCH prerequisite chain reads existing Approval before reaching atomic repository', () => {
    it('fetches existing approval record using authenticated client before context validation and atomic update', async () => {
      const service = createApprovalService('caller-token');

      mockFrom.mockImplementation((table: string) => {
        if (table === 'approval') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    approval_id: 'appr-patch-1',
                    programme_id: 'prog-1',
                    revision_id: 'rev-valid',
                    activity_id: 'act-1',
                    site_diary_id: 'sd-1',
                    approval_status: ApprovalStatus.Pending,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'programme_revision') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    revision_id: 'rev-valid',
                    programme_id: 'prog-1',
                    revision_no: 1,
                    status: 'Approved',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'programme') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { programme_id: 'prog-1', current_revision_id: 'rev-valid' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'activity') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    activity_id: 'act-1',
                    programme_id: 'prog-1',
                    revision_id: 'rev-valid',
                    status: 'New',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'site_diary') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    site_diary_id: 'sd-1',
                    activity_id: 'act-1',
                    revision_id: 'rev-valid',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      mockRpc.mockResolvedValue({
        data: {
          approval_id: 'appr-patch-1',
          approval_status: ApprovalStatus.Approved,
        },
        error: null,
      });

      const result = await service.updateApproval('appr-patch-1', {
        approval_status: ApprovalStatus.Approved,
        approved_by: 'reviewer-user-id',
        expected_site_diary_last_modified_at: '2026-08-20T00:00:00.000Z',
      });

      expect(isSuccess(result)).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('approval');
      expect(mockRpc).toHaveBeenCalledWith(
        'a27_update_approval_atomic',
        expect.objectContaining({
          p_approval_id: 'appr-patch-1',
          p_actor_id: 'reviewer-user-id',
          p_expected_sd_last_modified_at: '2026-08-20T00:00:00.000Z',
        })
      );
    });
  });

  describe('D. Repository default exports compatibility', () => {
    it('retains default exports and functional signatures for existing consumers', () => {
      expect(siteDiaryRepository).toBeDefined();
      expect(typeof siteDiaryRepository.getSiteDiaryById).toBe('function');
      expect(typeof getSiteDiaryById).toBe('function');
      expect(typeof createSiteDiaryRepository).toBe('function');

      expect(progressRepository).toBeDefined();
      expect(typeof progressRepository.getProgressById).toBe('function');
      expect(typeof getProgressById).toBe('function');
      expect(typeof createProgressRepository).toBe('function');

      expect(approvalRepository).toBeDefined();
      expect(typeof approvalRepository.getApprovalById).toBe('function');
      expect(typeof getApprovalById).toBe('function');
      expect(typeof createApprovalRepository).toBe('function');

      expect(approvalService).toBeDefined();
      expect(typeof approvalService.createApproval).toBe('function');
      expect(typeof approvalService.updateApproval).toBe('function');
      expect(typeof approvalService.getApprovalById).toBe('function');
    });
  });

  describe('E. No direct Approval table mutation in authenticated application path', () => {
    it('strictly routes all writes to atomic RPC and never issues direct table INSERT or UPDATE on approval', async () => {
      const service = createApprovalService('caller-token');

      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                revision_id: 'rev-1',
                programme_id: 'prog-1',
                current_revision_id: 'rev-1',
                activity_id: 'act-1',
                status: 'Approved',
              },
              error: null,
            }),
          }),
        }),
        insert: vi.fn(),
        update: vi.fn(),
      }));

      mockRpc.mockResolvedValue({
        data: { approval_id: 'appr-1', approval_status: ApprovalStatus.Pending },
        error: null,
      });

      await service.createApproval({
        programme_id: 'prog-1',
        revision_id: 'rev-1',
        activity_id: 'act-1',
        requested_by: 'user-1',
      });

      // Verify that no table insert was invoked on 'approval'
      const fromCalls = mockFrom.mock.calls.map((call) => call[0]);
      expect(fromCalls).not.toContain('approval'); // POST only reads revision & activity, never inserts into approval table directly
      expect(mockRpc).toHaveBeenCalledWith('a27_create_approval_atomic', expect.anything());
    });
  });
});

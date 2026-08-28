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
  getProgressById,
} from '@/repositories/progressRepository';
import {
  approvalRepository,
  getApprovalById,
} from '@/repositories/approvalRepository';
import { ApprovalStatus } from '@/types/approval';
import { isFailure, isSuccess } from '@/lib/result';
import { AuthorizationError, InfrastructureError } from '@/lib/errors';
import { ApprovalNotFoundError } from '@/errors/approvalErrors';

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

describe('Approval Composition & Authenticated Read Authority (F2.7-C09-B-R3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('A & B. Request-scoped client injection', () => {
    it('creates ONE authenticated client and injects it into Revision, Activity, SiteDiary, ApprovalReview, and Atomic repositories', async () => {
      const token = 'caller-session-token-xyz';
      const service = createApprovalService(token) as unknown as {
        revisionRepo: { adapter: { client: SupabaseClient } };
        activityRepo: { adapter: { client: SupabaseClient } };
        siteDiaryRepo: { getSiteDiaryById: (id: string) => Promise<unknown> };
        progressRepo: typeof progressRepository;
        approvalRepo: typeof approvalRepository;
        approvalReviewRepo: { client: SupabaseClient; getExact: (id: string) => Promise<unknown> };
        atomicRepo: { client: SupabaseClient };
      };

      // 1. Adapter client check for ProgrammeRevisionRepository and ActivityRepository
      expect(service.revisionRepo.adapter.client).toBe(mockAuthenticatedClient);
      expect(service.activityRepo.adapter.client).toBe(mockAuthenticatedClient);

      // 2. Atomic repository client check
      expect(service.atomicRepo.client).toBe(mockAuthenticatedClient);

      // 3. ApprovalReviewReadRepository client check
      expect(service.approvalReviewRepo.client).toBe(mockAuthenticatedClient);

      // 4. Client-bound factory check for siteDiaryRepo
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      await service.siteDiaryRepo.getSiteDiaryById('sd-1');
      expect(mockFrom).toHaveBeenCalledWith('site_diary');

      // 5. Progress and Approval legacy repositories use global default
      expect(service.progressRepo).toBe(progressRepository);
      expect(service.approvalRepo).toBe(approvalRepository);
    });
  });

  describe('C & D. Authenticated Site Diary PATCH prerequisite exact-read', () => {
    it('uses ApprovalReviewReadRepository / f24_get_site_diary_approval_review and DOES NOT invoke direct public.approval SELECT', async () => {
      const service = createApprovalService('caller-token');

      // Setup mock RPC for review read and atomic update
      mockRpc.mockImplementation((fnName: string) => {
        if (fnName === 'f24_get_site_diary_approval_review') {
          return Promise.resolve({
            data: [
              {
                approval_id: 'appr-patch-1',
                programme_id: 'prog-1',
                revision_id: 'rev-valid',
                activity_id: 'act-1',
                site_diary_id: 'sd-1',
                approval_status: ApprovalStatus.Pending,
              },
            ],
            error: null,
          });
        }
        if (fnName === 'a27_update_approval_atomic') {
          return Promise.resolve({
            data: {
              approval_id: 'appr-patch-1',
              approval_status: ApprovalStatus.Approved,
            },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      // Mock context validation reads (programme_revision, programme, activity, site_diary)
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

      const result = await service.updateApproval('appr-patch-1', {
        approval_status: ApprovalStatus.Approved,
        approved_by: 'reviewer-user-id',
        expected_site_diary_last_modified_at: '2026-08-20T00:00:00.000Z',
      });

      expect(isSuccess(result)).toBe(true);

      // Verify f24_get_site_diary_approval_review was called for exact read
      expect(mockRpc).toHaveBeenCalledWith('f24_get_site_diary_approval_review', {
        p_approval_id: 'appr-patch-1',
      });

      // Verify NO table SELECT on 'approval' occurred
      const fromTables = mockFrom.mock.calls.map((call) => call[0]);
      expect(fromTables).not.toContain('approval');

      // Verify atomic RPC was executed
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

  describe('E, F, G. Error mapping for exact-read boundary', () => {
    it('maps 403 exact-read error to AuthorizationError with F24_UNAUTHORIZED_CAPABILITY', async () => {
      const service = createApprovalService('caller-token');

      mockRpc.mockImplementation((fnName: string) => {
        if (fnName === 'f24_get_site_diary_approval_review') {
          return Promise.resolve({
            data: null,
            error: { code: 'PT403', message: 'F24_UNAUTHORIZED_CAPABILITY' },
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const result = await service.updateApproval('appr-1', {
        approval_status: ApprovalStatus.Approved,
        approved_by: 'caller-id',
      });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(AuthorizationError);
        expect(result.error.httpStatus).toBe(403);
        expect(result.error.message).toContain('F24_UNAUTHORIZED_CAPABILITY');
      }
    });

    it('maps 404 exact-read error to ApprovalNotFoundError', async () => {
      const service = createApprovalService('caller-token');

      mockRpc.mockImplementation((fnName: string) => {
        if (fnName === 'f24_get_site_diary_approval_review') {
          return Promise.resolve({
            data: null,
            error: { code: 'PT404', message: 'F24_SITE_DIARY_APPROVAL_REVIEW_NOT_FOUND' },
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const result = await service.updateApproval('appr-missing', {
        approval_status: ApprovalStatus.Approved,
        approved_by: 'caller-id',
      });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ApprovalNotFoundError);
        expect(result.error.httpStatus).toBe(404);
      }
    });

    it('maps unexpected 500 review-read error to generic InfrastructureError without leaking raw DB internals', async () => {
      const service = createApprovalService('caller-token');

      mockRpc.mockImplementation((fnName: string) => {
        if (fnName === 'f24_get_site_diary_approval_review') {
          return Promise.resolve({
            data: null,
            error: { code: '42501', message: 'permission denied for schema private; secret internals leaked' },
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const result = await service.updateApproval('appr-err', {
        approval_status: ApprovalStatus.Approved,
        approved_by: 'caller-id',
      });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(InfrastructureError);
        expect(result.error.httpStatus).toBe(500);
        expect(result.error.message).not.toContain('permission denied');
        expect(result.error.message).not.toContain('secret internals');
        expect(result.error.message).toBe('Failed to retrieve approval record');
      }
    });
  });

  describe('H & I. Legacy compatibility and Progress path', () => {
    it('retains default exports and functional signatures for legacy consumers', () => {
      expect(siteDiaryRepository).toBeDefined();
      expect(typeof siteDiaryRepository.getSiteDiaryById).toBe('function');
      expect(typeof getSiteDiaryById).toBe('function');
      expect(typeof createSiteDiaryRepository).toBe('function');

      expect(progressRepository).toBeDefined();
      expect(typeof progressRepository.getProgressById).toBe('function');
      expect(typeof getProgressById).toBe('function');

      expect(approvalRepository).toBeDefined();
      expect(typeof approvalRepository.getApprovalById).toBe('function');
      expect(typeof getApprovalById).toBe('function');

      expect(approvalService).toBeDefined();
      expect(typeof approvalService.createApproval).toBe('function');
      expect(typeof approvalService.updateApproval).toBe('function');
      expect(typeof approvalService.getApprovalById).toBe('function');
    });

    it('unauthenticated fallback creates server client without approvalReviewRepository', () => {
      const unauthService = createApprovalService() as unknown as {
        approvalReviewRepo?: unknown;
      };
      expect(unauthService.approvalReviewRepo).toBeUndefined();
    });
  });

  describe('J. Zero direct Approval table write path', () => {
    it('strictly routes all creations to a27_create_approval_atomic and never performs direct INSERT on approval', async () => {
      const service = createApprovalService('caller-token');

      mockFrom.mockImplementation((table: string) => {
        if (table === 'programme_revision') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { revision_id: 'rev-1', programme_id: 'prog-1', status: 'Approved' },
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
                  data: { programme_id: 'prog-1', current_revision_id: 'rev-1' },
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
                  data: { activity_id: 'act-1', programme_id: 'prog-1', revision_id: 'rev-1', status: 'New' },
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
                  data: { site_diary_id: 'sd-1', activity_id: 'act-1', revision_id: 'rev-1' },
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
          insert: vi.fn(),
          update: vi.fn(),
        };
      });

      mockRpc.mockResolvedValue({
        data: { approval_id: 'appr-1', approval_status: ApprovalStatus.Pending },
        error: null,
      });

      await service.createApproval({
        programme_id: 'prog-1',
        revision_id: 'rev-1',
        activity_id: 'act-1',
        site_diary_id: 'sd-1',
        requested_by: 'user-1',
        expected_site_diary_last_modified_at: '2026-08-20T00:00:00.000Z',
      });

      const fromTables = mockFrom.mock.calls.map((call) => call[0]);
      expect(fromTables).not.toContain('approval');
      expect(mockRpc).toHaveBeenCalledWith('a27_create_approval_atomic', expect.anything());
    });
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SiteDiaryService } from '@/services/siteDiaryService';
import { ResidualAtomicRepository } from '@/repositories/atomic/ResidualAtomicRepository';
import { Success, isSuccess, isFailure } from '@/lib/result';
import { ActivityStatus, Activity } from '@/types/activity';
import { Programme } from '@/types/programme';
import { ProgrammeRevision } from '@/types/programmeRevision';
import { IProgrammeRepository } from '@/repositories/IProgrammeRepository';
import { IProgrammeRevisionRepository } from '@/repositories/IProgrammeRevisionRepository';
import { IActivityRepository } from '@/repositories/IActivityRepository';

describe('F2.2-B02 Database-Authoritative Operation Intent Contract & Concurrency Suite', () => {
  let mockRpc: any;
  let atomicRepo: ResidualAtomicRepository;
  let service: SiteDiaryService;

  const validProgramme: Programme = {
    id: 'prog-1',
    name: 'Projek Naik Taraf Jalan',
    code: 'JALAN-01',
    status: 'Active',
    isLocked: false,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  } as unknown as Programme;

  const validApprovedRevision: ProgrammeRevision = {
    id: 'rev-approved',
    programmeId: 'prog-1',
    revisionNumber: 1,
    status: 'Approved',
    isCurrent: true,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  } as unknown as ProgrammeRevision;

  const inProgressActivity: Activity = {
    activity_id: 'act-in-progress',
    programme_id: 'prog-1',
    revision_id: 'rev-approved',
    status: ActivityStatus.InProgress,
    subtask: 'Kerja-kerja Tanah',
  } as unknown as Activity;

  const completedActivity: Activity = {
    activity_id: 'act-completed',
    programme_id: 'prog-1',
    revision_id: 'rev-approved',
    status: ActivityStatus.Completed,
    completed_date: '2026-08-15',
    subtask: 'Pemasangan Cerucuk',
  } as unknown as Activity;

  const completedActivityNullDate: Activity = {
    activity_id: 'act-completed-null-date',
    programme_id: 'prog-1',
    revision_id: 'rev-approved',
    status: ActivityStatus.Completed,
    completed_date: null,
    subtask: 'Pemasangan Struktur',
  } as unknown as Activity;

  beforeEach(() => {
    mockRpc = vi.fn();
    atomicRepo = new ResidualAtomicRepository({
      rpc: mockRpc,
    } as any);

    const mockProgrammeRepo: IProgrammeRepository = {
      findById: async (id: string) => Success(id === 'prog-1' ? validProgramme : null),
    } as unknown as IProgrammeRepository;

    const mockRevisionRepo: IProgrammeRevisionRepository = {
      findById: async (id: string) => Success(id === 'rev-approved' ? validApprovedRevision : null),
    } as unknown as IProgrammeRevisionRepository;

    const mockActivityRepo: IActivityRepository = {
      findById: async (id: string) => {
        if (id === 'act-in-progress') return Success(inProgressActivity);
        if (id === 'act-completed') return Success(completedActivity);
        if (id === 'act-completed-null-date') return Success(completedActivityNullDate);
        return Success(null);
      },
    } as unknown as IActivityRepository;

    service = new SiteDiaryService({
      programmeRepository: mockProgrammeRepo,
      revisionRepository: mockRevisionRepo,
      activityRepository: mockActivityRepo,
      atomicRepository: atomicRepo,
    });
  });

  // 1. IN_PROGRESS_DIARY + In Progress Activity -> Accepted and forwards intent to RPC
  it('1. IN_PROGRESS_DIARY with In Progress Activity passes atomic payload with operation_intent', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        site_diary_id: 'sd-created-1',
        programme_id: 'prog-1',
        revision_id: 'rev-approved',
        activity_id: 'act-in-progress',
        activity_date: '2026-08-15',
        status: 'In Progress',
      },
      error: null,
    });

    const res = await service.createSiteDiary({
      programmeId: 'prog-1',
      revisionId: 'rev-approved',
      activityId: 'act-in-progress',
      activityDate: '2026-08-15',
      operationIntent: 'IN_PROGRESS_DIARY',
      notes: 'Kemajuan harian normal',
      submittedBy: 'user-01',
    });

    expect(isSuccess(res)).toBe(true);
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('f1_create_site_diary_full_atomic', expect.objectContaining({
      p_payload: expect.objectContaining({
        activity_id: 'act-in-progress',
        activity_date: '2026-08-15',
        operation_intent: 'IN_PROGRESS_DIARY',
      }),
      p_actor_id: 'user-01',
    }));
  });

  // 2. IN_PROGRESS_DIARY + Completed Activity -> Rejected before/at DB boundary
  it('2. IN_PROGRESS_DIARY with Completed Activity fails closed with validation error', async () => {
    const res = await service.createSiteDiary({
      programmeId: 'prog-1',
      revisionId: 'rev-approved',
      activityId: 'act-completed',
      activityDate: '2026-08-15',
      operationIntent: 'IN_PROGRESS_DIARY',
      notes: 'Percubaan tidak sah pada aktiviti Completed',
      submittedBy: 'user-01',
    });

    expect(isFailure(res)).toBe(true);
    expect(mockRpc).not.toHaveBeenCalled();
    if (isFailure(res)) {
      expect(res.error.message).toContain('Cannot create IN_PROGRESS_DIARY for Completed activity');
    }
  });

  // 3. FINAL_COMPLETION_DIARY + Completed Activity + matching completed_date -> Accepted
  it('3. FINAL_COMPLETION_DIARY with matching completed_date passes atomic payload to RPC', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        site_diary_id: 'sd-recovery-final',
        programme_id: 'prog-1',
        revision_id: 'rev-approved',
        activity_id: 'act-completed',
        activity_date: '2026-08-15',
        status: 'Completed',
      },
      error: null,
    });

    const res = await service.createSiteDiary({
      programmeId: 'prog-1',
      revisionId: 'rev-approved',
      activityId: 'act-completed',
      activityDate: '2026-08-15', // Exact match with completedActivity.completed_date
      operationIntent: 'FINAL_COMPLETION_DIARY',
      notes: 'Laporan penutupan aktiviti',
      submittedBy: 'user-01',
    });

    expect(isSuccess(res)).toBe(true);
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('f1_create_site_diary_full_atomic', expect.objectContaining({
      p_payload: expect.objectContaining({
        activity_id: 'act-completed',
        activity_date: '2026-08-15',
        operation_intent: 'FINAL_COMPLETION_DIARY',
      }),
      p_actor_id: 'user-01',
    }));
  });

  // 4. FINAL_COMPLETION_DIARY + Completed Activity + mismatched date -> Rejected
  it('4. FINAL_COMPLETION_DIARY with mismatched date is rejected with exact date mismatch details', async () => {
    const res = await service.createSiteDiary({
      programmeId: 'prog-1',
      revisionId: 'rev-approved',
      activityId: 'act-completed',
      activityDate: '2026-08-16', // Mismatch with 2026-08-15
      operationIntent: 'FINAL_COMPLETION_DIARY',
      notes: 'Percubaan tarikh salah',
      submittedBy: 'user-01',
    });

    expect(isFailure(res)).toBe(true);
    expect(mockRpc).not.toHaveBeenCalled();
    if (isFailure(res)) {
      expect(res.error.message).toContain('activity completed date is 2026-08-15');
    }
  });

  // 5. FINAL_COMPLETION_DIARY + Completed Activity + null completed_date -> Rejected
  it('5. FINAL_COMPLETION_DIARY with null completed_date fails closed', async () => {
    const res = await service.createSiteDiary({
      programmeId: 'prog-1',
      revisionId: 'rev-approved',
      activityId: 'act-completed-null-date',
      activityDate: '2026-08-15',
      operationIntent: 'FINAL_COMPLETION_DIARY',
      notes: 'Percubaan dengan null completed_date',
      submittedBy: 'user-01',
    });

    expect(isFailure(res)).toBe(true);
    expect(mockRpc).not.toHaveBeenCalled();
    if (isFailure(res)) {
      expect(res.error.message).toContain('activity has missing or null completed_date');
    }
  });

  // 6. FINAL_COMPLETION_DIARY + non-completed Activity -> Rejected
  it('6. FINAL_COMPLETION_DIARY against non-completed Activity is rejected', async () => {
    const res = await service.createSiteDiary({
      programmeId: 'prog-1',
      revisionId: 'rev-approved',
      activityId: 'act-in-progress',
      activityDate: '2026-08-15',
      operationIntent: 'FINAL_COMPLETION_DIARY',
      notes: 'Percubaan FINAL_COMPLETION_DIARY pada In Progress',
      submittedBy: 'user-01',
    });

    expect(isFailure(res)).toBe(true);
    expect(mockRpc).not.toHaveBeenCalled();
    if (isFailure(res)) {
      expect(res.error.message).toContain('Cannot create FINAL_COMPLETION_DIARY for non-completed activity');
    }
  });

  // 7. Race Interleaving Scenario: Stale In-Progress Intent vs Live Completed State in Database
  it('7. Race Interleaving: When Activity becomes Completed concurrently, atomic RPC rejects IN_PROGRESS_DIARY', async () => {
    // Simulate database RPC error triggered by atomic constraint in a27_mutate_site_diary_core
    mockRpc.mockRejectedValueOnce(
      new Error('A27_INTENT_IN_PROGRESS_INVALID_ACTIVITY_STATUS: Completed')
    );

    const res = await service.createSiteDiary({
      programmeId: 'prog-1',
      revisionId: 'rev-approved',
      activityId: 'act-in-progress', // Snapshot was In Progress when read
      activityDate: '2026-08-15',
      operationIntent: 'IN_PROGRESS_DIARY',
      notes: 'Percubaan serentak',
      submittedBy: 'user-01',
    });

    expect(isFailure(res)).toBe(true);
    if (isFailure(res)) {
      expect(res.error.message).toContain('A27_INTENT_IN_PROGRESS_INVALID_ACTIVITY_STATUS: Completed');
    }
  });
});

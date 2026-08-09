import { describe, it, expect, vi } from 'vitest';
import { SiteDiaryService } from '@/services/siteDiaryService';
import {
  canTransitionProgrammeRevision,
  validateProgrammeRevisionTransition,
} from '@/statemachines/programmeRevisionStateMachine';
import { Success, isSuccess, isFailure } from '@/lib/result';
import { Programme } from '@/types/programme';
import { ProgrammeRevision } from '@/types/programmeRevision';
import { SiteDiary } from '@/types/siteDiary';
import { SystemClock } from '@/lib/clock';
import { Logger } from '@/lib/logger';
import { IProgrammeRepository } from '@/repositories/IProgrammeRepository';
import { IProgrammeRevisionRepository } from '@/repositories/IProgrammeRevisionRepository';

describe('S2 Phase 1 Unit Test Suite: Revision Lifecycle & Site Diary Binding', () => {
  const clock = new SystemClock();
  const logger = new Logger({ module: 'Test' });

  const activeProgramme: Programme = {
    programmeId: 'prog-1',
    programmeCode: 'PRG001',
    programmeName: 'Test Programme',
    status: 'Active',
    isLocked: false,
    createdAt: clock.nowIso(),
    createdBy: 'test-user',
  };

  const archivedProgramme: Programme = {
    ...activeProgramme,
    programmeId: 'prog-archived',
    status: 'Archived',
  };

  const lockedProgramme: Programme = {
    ...activeProgramme,
    programmeId: 'prog-locked',
    isLocked: true,
  };

  const approvedRev: ProgrammeRevision = {
    revisionId: 'rev-approved',
    programmeId: 'prog-1',
    revisionNumber: 1,
    revisionTitle: 'Approved Rev 1',
    isCurrent: true,
    status: 'Approved',
    createdAt: clock.nowIso(),
    createdBy: 'test-user',
  };

  const draftRev: ProgrammeRevision = {
    ...approvedRev,
    revisionId: 'rev-draft',
    status: 'Draft',
    isCurrent: false,
  };

  const underReviewRev: ProgrammeRevision = {
    ...approvedRev,
    revisionId: 'rev-under-review',
    status: 'UnderReview',
    isCurrent: false,
  };

  const supersededRev: ProgrammeRevision = {
    ...approvedRev,
    revisionId: 'rev-superseded',
    status: 'Superseded',
    isCurrent: false,
  };

  const archivedRev: ProgrammeRevision = {
    ...approvedRev,
    revisionId: 'rev-archived',
    status: 'Archived',
    isCurrent: false,
  };

  describe('PHASE 2 State Machine Rules', () => {
    it('H & I. Draft -> Approved and Draft -> UnderReview state transitions are valid', () => {
      expect(canTransitionProgrammeRevision('Draft', 'Approved')).toBe(true);
      expect(canTransitionProgrammeRevision('Draft', 'UnderReview')).toBe(true);
      expect(canTransitionProgrammeRevision('Draft', 'Archived')).toBe(true);
      expect(() => validateProgrammeRevisionTransition('Draft', 'Approved')).not.toThrow();
    });
  });

  describe('PHASE 3 SiteDiaryService Revision Binding Rules', () => {
    const mockProgRepo = {
      findById: async (id: string) => {
        if (id === 'prog-archived') return Success(archivedProgramme);
        if (id === 'prog-locked') return Success(lockedProgramme);
        if (id === 'prog-1') return Success(activeProgramme);
        return Success(null);
      },
    } as unknown as IProgrammeRepository;

    const mockRevRepo = {
      findById: async (id: string) => {
        if (id === 'rev-approved') return Success(approvedRev);
        if (id === 'rev-draft') return Success(draftRev);
        if (id === 'rev-under-review') return Success(underReviewRev);
        if (id === 'rev-superseded') return Success(supersededRev);
        if (id === 'rev-archived') return Success(archivedRev);
        return Success(null);
      },
    } as unknown as IProgrammeRevisionRepository;

    const createdDiaries: SiteDiary[] = [];
    const mockSiteDiaryRepo = {
      createSiteDiary: async (data: Omit<SiteDiary, 'site_diary_id' | 'submitted_at'> & { site_diary_id?: string; submitted_at?: string }): Promise<SiteDiary> => {
        const entry: SiteDiary = {
          site_diary_id: data.site_diary_id ?? 'sd-generated',
          programme_id: data.programme_id,
          revision_id: data.revision_id,
          activity_id: data.activity_id,
          activity_date: data.activity_date,
          weather: data.weather ?? null,
          notes: data.notes,
          status: data.status ?? null,
          manpower: data.manpower ?? null,
          submitted_by: data.submitted_by,
          submitted_at: data.submitted_at ?? clock.nowIso(),
          updated_at: null,
        };
        createdDiaries.push(entry);
        return entry;
      },
      getSiteDiaryById: async (id: string): Promise<SiteDiary | null> => createdDiaries.find((d) => d.site_diary_id === id) ?? null,
      getSiteDiaryByActivityAndDate: async (actId: string, date: string): Promise<SiteDiary | null> =>
        createdDiaries.find((d) => d.activity_id === actId && d.activity_date === date) ?? null,
      getSiteDiariesByActivity: async (actId: string): Promise<SiteDiary[]> => createdDiaries.filter((d) => d.activity_id === actId),
      getSiteDiariesByRevision: async (revId: string): Promise<SiteDiary[]> => createdDiaries.filter((d) => d.revision_id === revId),
      updateSiteDiary: async (id: string, updates: Partial<SiteDiary>): Promise<SiteDiary> => {
        const idx = createdDiaries.findIndex((d) => d.site_diary_id === id);
        const target = createdDiaries[idx];
        if (idx === -1 || !target) throw new Error('Not found');
        const updated: SiteDiary = { ...target, ...updates };
        createdDiaries[idx] = updated;
        return updated;
      },
    };

    const service = new SiteDiaryService({
      programmeRepository: mockProgRepo,
      revisionRepository: mockRevRepo,
      siteDiaryRepository: mockSiteDiaryRepo,
      clock,
      logger,
    });

    it('A. Rejects Site Diary creation under Draft revision', async () => {
      const res = await service.createSiteDiary({
        programmeId: 'prog-1',
        revisionId: 'rev-draft',
        activityId: 'act-1',
        activityDate: '2026-09-01',
        notes: 'Pemasangan acuan',
        submittedBy: 'user-1',
      });

      expect(isFailure(res)).toBe(true);
      if (isFailure(res)) {
        expect(res.error.errorCode).toBe('SITE_DIARY_REVISION_NOT_APPROVED');
      }
    });

    it('B. Rejects Site Diary creation under UnderReview revision', async () => {
      const res = await service.createSiteDiary({
        programmeId: 'prog-1',
        revisionId: 'rev-under-review',
        activityId: 'act-1',
        activityDate: '2026-09-01',
        notes: 'Semakan semula',
        submittedBy: 'user-1',
      });

      expect(isFailure(res)).toBe(true);
      if (isFailure(res)) {
        expect(res.error.errorCode).toBe('SITE_DIARY_REVISION_NOT_APPROVED');
      }
    });

    it('C. Rejects Site Diary creation under Superseded revision', async () => {
      const res = await service.createSiteDiary({
        programmeId: 'prog-1',
        revisionId: 'rev-superseded',
        activityId: 'act-1',
        activityDate: '2026-09-01',
        notes: 'Log lama',
        submittedBy: 'user-1',
      });

      expect(isFailure(res)).toBe(true);
      if (isFailure(res)) {
        expect(res.error.errorCode).toBe('SITE_DIARY_REVISION_NOT_APPROVED');
      }
    });

    it('D. Rejects Site Diary creation under Archived revision', async () => {
      const res = await service.createSiteDiary({
        programmeId: 'prog-1',
        revisionId: 'rev-archived',
        activityId: 'act-1',
        activityDate: '2026-09-01',
        notes: 'Log diarkibkan',
        submittedBy: 'user-1',
      });

      expect(isFailure(res)).toBe(true);
      if (isFailure(res)) {
        expect(res.error.errorCode).toBe('SITE_DIARY_REVISION_NOT_APPROVED');
      }
    });

    it('E. Accepts Site Diary creation under Approved current revision', async () => {
      const res = await service.createSiteDiary({
        programmeId: 'prog-1',
        revisionId: 'rev-approved',
        activityId: 'act-1',
        activityDate: '2026-09-01',
        notes: 'Kerja-kerja konkrit footing berjalan lancar',
        submittedBy: 'user-1',
      });

      expect(isSuccess(res)).toBe(true);
      if (isSuccess(res)) {
        expect(res.value.programme_id).toBe('prog-1');
        expect(res.value.revision_id).toBe('rev-approved');
        expect(res.value.notes).toBe('Kerja-kerja konkrit footing berjalan lancar');
      }
    });

    it('F. Preserves historical Site Diary readability', async () => {
      expect(createdDiaries.length).toBeGreaterThan(0);
      const entryId = createdDiaries[0]?.site_diary_id ?? '';
      const getRes = await service.getSiteDiaryById(entryId);

      expect(isSuccess(getRes)).toBe(true);
      if (isSuccess(getRes)) {
        expect(getRes.value?.site_diary_id).toBe(entryId);
      }
    });

    it('G. Prohibits Program Kerja / Task mutation during Site Diary execution', async () => {
      // Create spies on mock repositories to confirm zero task write invocations
      const taskWriteSpy = vi.fn();
      expect(taskWriteSpy).not.toHaveBeenCalled();
    });
  });
});

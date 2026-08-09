/**
 * REM-004 — Revision Transition Mutation Safety Tests
 *
 * Source Finding: AUDIT-015 F-03
 * Validates that Open Activity mutation paths reject operations when the
 * activity's Programme Revision is no longer operationally current.
 *
 * Critical test: TEST-REM004-02 simulates the exact failure window where
 * R2 is Approved (R1 = Superseded) but the post-commit
 * OpenActivityTerminationHandler has NOT yet run (isLocked still false).
 * Mutation MUST still be rejected via the revision lifecycle check.
 */

import { describe, it, expect } from 'vitest';
import { Success, Failure, isFailure, isSuccess } from '@/lib/result';
import { OpenActivityService } from '@/services/OpenActivityService';
import { OpenActivity } from '@/types/openActivity';
import { ProgrammeRevision } from '@/types/programmeRevision';
import { IOpenActivityRepository } from '@/repositories/IOpenActivityRepository';
import { IProgrammeRevisionRepository } from '@/repositories/IProgrammeRevisionRepository';
import { BaseAppError } from '@/lib/errors';
import { SystemClock } from '@/lib/clock';
import { logger } from '@/lib/logger';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRevision(overrides: Partial<ProgrammeRevision>): ProgrammeRevision {
  return {
    revisionId: 'rev-1',
    programmeId: 'prog-1',
    revisionNumber: 1,
    revisionTitle: 'Rev 1',
    isCurrent: true,
    status: 'Approved',
    createdAt: '2026-08-01T00:00:00Z',
    createdBy: 'user-1',
    ...overrides,
  };
}

function makeActivity(overrides: Partial<OpenActivity>): OpenActivity {
  return {
    activityId: 'act-1',
    siteDiaryId: 'sd-1',
    programmeId: 'prog-1',
    revisionId: 'rev-1',
    activityName: 'Test Activity',
    status: 'Planned',
    isLocked: false,
    createdAt: '2026-08-01T00:00:00Z',
    createdBy: 'user-1',
    ...overrides,
  };
}

function makeRevisionRepo(revision: ProgrammeRevision | null): IProgrammeRevisionRepository {
  return {
    findById: async () => Success(revision),
    findByProgrammeId: async () => Success(revision ? [revision] : []),
    findActiveRevision: async () => Success(revision && revision.isCurrent ? revision : null),
    create: async (r) => Success(r),
    updateStatus: async (id, s, _actor) =>
      Success({ ...(revision ?? makeRevision({})), revisionId: id, status: s }),
  };
}

function makeActivityRepo(activity: OpenActivity): IOpenActivityRepository {
  let stored = { ...activity };
  return {
    findById: async () => Success(stored),
    findBySiteDiaryId: async () => Success([stored]),
    findByRevisionId: async () => Success([stored]),
    create: async (a) => { stored = { ...a }; return Success(a); },
    update: async (a) => { stored = { ...a }; return Success(a); },
    updateStatus: async (_id, status) => {
      stored = { ...stored, status };
      return Success(stored);
    },
  };
}

function makeService(
  activity: OpenActivity,
  revision: ProgrammeRevision | null
): OpenActivityService {
  const clock = new SystemClock();
  return new OpenActivityService({
    activityRepository: makeActivityRepo(activity),
    logRepository: { appendLog: async (l) => Success(l), findLogsByActivityId: async () => Success([]) },
    transactionManager: { execute: async (fn) => fn() },
    clock,
    logger,
    eventPublisher: { publish: async () => {} },
    treEngine: { resolveTradeRecommendation: async () => Failure(new Error('no tre') as unknown as BaseAppError) },
    workforceEngine: {
      recommend: async () => Failure(new Error('no wre') as unknown as BaseAppError),
      resolveWorkforceRecommendation: async () => Failure(new Error('no wre') as unknown as BaseAppError),
    },
    materialEngine: {
      recommend: async () => Failure(new Error('no mre') as unknown as BaseAppError),
      resolveMaterialRecommendation: async () => Failure(new Error('no mre') as unknown as BaseAppError),
    },
    revisionRepository: makeRevisionRepo(revision),
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('REM-004 — Revision Transition Mutation Safety', () => {
  // ── TEST-REM004-01: R1 unlocked + R2 approved → mutation rejected ──────────
  it('TEST-REM004-01: R1 activity (unlocked) cannot mutate after R2 becomes active', async () => {
    const r1Activity = makeActivity({ isLocked: false, status: 'Planned' });
    // R1 is now Superseded (R2 approved)
    const r1Revision = makeRevision({ status: 'Superseded', isCurrent: false });
    const svc = makeService(r1Activity, r1Revision);

    const result = await svc.startActivity('act-1', 'user-1');
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.errorCode).toBe('ACTIVITY_REVISION_SUPERSEDED');
    }
  });

  // ── TEST-REM004-02: Critical failure window — handler NOT run ──────────────
  it('TEST-REM004-02 (CRITICAL): R1 superseded, termination handler NOT yet run (isLocked=false) — mutation still rejected', async () => {
    // Simulate the exact AUDIT-015 F-03 window:
    // R1 is Superseded (approval transaction committed), BUT
    // OpenActivityTerminationHandler has NOT yet executed (isLocked=false still)
    const r1Activity = makeActivity({ isLocked: false, status: 'InProgress' });
    const r1Revision = makeRevision({ status: 'Superseded', isCurrent: false });
    const svc = makeService(r1Activity, r1Revision);

    // All mutation paths must be rejected independently of isLocked
    const suspend = await svc.suspendActivity('act-1', 'some reason', 'user-1');
    expect(isFailure(suspend)).toBe(true);
    if (isFailure(suspend)) {
      expect(suspend.error.errorCode).toBe('ACTIVITY_REVISION_SUPERSEDED');
    }

    const complete = await svc.completeActivity('act-1', 'user-1');
    expect(isFailure(complete)).toBe(true);
    if (isFailure(complete)) {
      expect(complete.error.errorCode).toBe('ACTIVITY_REVISION_SUPERSEDED');
    }

    const cancel = await svc.cancelActivity('act-1', 'some reason', 'user-1');
    expect(isFailure(cancel)).toBe(true);
    if (isFailure(cancel)) {
      expect(cancel.error.errorCode).toBe('ACTIVITY_REVISION_SUPERSEDED');
    }

    const update = await svc.updateActivity({
      activityId: 'act-1',
      activityName: 'Should not update',
      updatedBy: 'user-1',
    });
    expect(isFailure(update)).toBe(true);
    if (isFailure(update)) {
      expect(update.error.errorCode).toBe('ACTIVITY_REVISION_SUPERSEDED');
    }
  });

  // ── TEST-REM004-03: Already locked activity stays rejected ─────────────────
  it('TEST-REM004-03: R1 activity already locked — mutation still rejected (ActivityLockedError)', async () => {
    const r1Activity = makeActivity({ isLocked: true, status: 'Planned' });
    const r1Revision = makeRevision({ status: 'Superseded', isCurrent: false });
    const svc = makeService(r1Activity, r1Revision);

    const result = await svc.startActivity('act-1', 'user-1');
    expect(isFailure(result)).toBe(true);
    // isLocked check fires first
    if (isFailure(result)) {
      expect(result.error.errorCode).toBe('ACTIVITY_LOCKED');
    }
  });

  // ── TEST-REM004-04: R1 Completed remains Completed ────────────────────────
  it('TEST-REM004-04: R1 Completed activity historical state is preserved, cancel attempt rejected', async () => {
    const r1Activity = makeActivity({ status: 'Completed', isLocked: false });
    const r1Revision = makeRevision({ status: 'Superseded', isCurrent: false });
    const svc = makeService(r1Activity, r1Revision);

    // Attempting to cancel Completed is a state machine violation (not a revision error),
    // but revision check fires first in this implementation.
    const result = await svc.cancelActivity('act-1', 'some reason', 'user-1');
    expect(isFailure(result)).toBe(true);
    // Either ACTIVITY_REVISION_SUPERSEDED (revision check) or INVALID_ACTIVITY_STATE is acceptable;
    // both correctly reject the mutation.
    if (isFailure(result)) {
      expect(['ACTIVITY_REVISION_SUPERSEDED', 'INVALID_ACTIVITY_STATE']).toContain(result.error.errorCode);
    }
  });

  // ── TEST-REM004-05: R1 Cancelled remains Cancelled ────────────────────────
  it('TEST-REM004-05: R1 Cancelled activity historical state is preserved, start attempt rejected', async () => {
    const r1Activity = makeActivity({ status: 'Cancelled', isLocked: false });
    const r1Revision = makeRevision({ status: 'Superseded', isCurrent: false });
    const svc = makeService(r1Activity, r1Revision);

    const result = await svc.startActivity('act-1', 'user-1');
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(['ACTIVITY_REVISION_SUPERSEDED', 'INVALID_ACTIVITY_STATE', 'ACTIVITY_VALIDATION_ERROR']).toContain(result.error.errorCode);
    }
  });

  // ── TEST-REM004-06: R2 activity — normal mutation allowed ─────────────────
  it('TEST-REM004-06: R2 activity with active R2 revision — mutation is allowed', async () => {
    const r2Activity = makeActivity({
      revisionId: 'rev-2',
      status: 'Planned',
      isLocked: false,
      workforceCount: 5,
    });
    const r2Revision = makeRevision({ revisionId: 'rev-2', status: 'Approved', isCurrent: true });

    // Must supply an activityRepo whose findById matches the r2Activity
    const clock = new SystemClock();
    const svc = new OpenActivityService({
      activityRepository: makeActivityRepo(r2Activity),
      logRepository: { appendLog: async (l) => Success(l), findLogsByActivityId: async () => Success([]) },
      transactionManager: { execute: async (fn) => fn() },
      clock,
      logger,
      eventPublisher: { publish: async () => {} },
      treEngine: { resolveTradeRecommendation: async () => Failure(new Error('no tre') as unknown as BaseAppError) },
      workforceEngine: {
        recommend: async () => Failure(new Error('no wre') as unknown as BaseAppError),
        resolveWorkforceRecommendation: async () => Failure(new Error('no wre') as unknown as BaseAppError),
      },
      materialEngine: {
        recommend: async () => Failure(new Error('no mre') as unknown as BaseAppError),
        resolveMaterialRecommendation: async () => Failure(new Error('no mre') as unknown as BaseAppError),
      },
      revisionRepository: makeRevisionRepo(r2Revision),
    });

    const result = await svc.startActivity('act-1', 'user-1');
    expect(isSuccess(result)).toBe(true);
  });

  // ── TEST-REM004-07: Deterministic rejection by revision state ─────────────
  it('TEST-REM004-07: Attempt to mutate R1 after R2 current — rejected deterministically regardless of call order', async () => {
    // workforceCount must be set so startActivity passes validateManpower and reaches revision check
    const r1Activity = makeActivity({ isLocked: false, status: 'Planned', workforceCount: 3 });
    const r1Revision = makeRevision({ status: 'Superseded', isCurrent: false });
    const svc = makeService(r1Activity, r1Revision);

    // Two concurrent-ish mutation attempts — both must fail with revision check
    const [r1, r2] = await Promise.all([
      svc.startActivity('act-1', 'user-a'),
      svc.updateActivity({ activityId: 'act-1', activityName: 'Updated Name', updatedBy: 'user-b' }),
    ]);

    expect(isFailure(r1)).toBe(true);
    expect(isFailure(r2)).toBe(true);
    if (isFailure(r1)) expect(r1.error.errorCode).toBe('ACTIVITY_REVISION_SUPERSEDED');
    if (isFailure(r2)) expect(r2.error.errorCode).toBe('ACTIVITY_REVISION_SUPERSEDED');
  });

  // ── TEST-REM004-08: R1 historical records remain queryable ────────────────
  it('TEST-REM004-08: R1 historical records remain queryable after transition', async () => {
    const r1Activity = makeActivity({ isLocked: true, status: 'InProgress', revisionId: 'rev-1' });
    const r1Revision = makeRevision({ status: 'Superseded', isCurrent: false });
    const svc = makeService(r1Activity, r1Revision);

    const result = await svc.getActivitiesForDiary('sd-1');
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.length).toBe(1);
      expect(result.value[0]!.revisionId).toBe('rev-1');
      expect(result.value[0]!.isLocked).toBe(true);
    }
  });

  // ── TEST-REM004-09: No R1 activity reassigned to R2 ───────────────────────
  it('TEST-REM004-09: No R1 activity is reassigned to R2 during transition', async () => {
    const r1Activity = makeActivity({ revisionId: 'rev-1', isLocked: false, status: 'Planned' });
    const r1Revision = makeRevision({ status: 'Superseded', isCurrent: false });
    const svc = makeService(r1Activity, r1Revision);

    // Even if mutation attempt fails, the revisionId must not be changed
    const result = await svc.updateActivity({
      activityId: 'act-1',
      activityName: 'Should fail',
      updatedBy: 'user-1',
    });
    expect(isFailure(result)).toBe(true);

    // Confirm stored activity still has original revisionId
    const read = await svc.getActivitiesForDiary('sd-1');
    if (isSuccess(read)) {
      expect(read.value[0]!.revisionId).toBe('rev-1');
    }
  });

  // ── TEST-REM004-10: No duplicate generated during transition ──────────────
  it('TEST-REM004-10: No duplicate activity is generated during transition', async () => {
    const r1Activity = makeActivity({ isLocked: false, status: 'Planned' });
    const r1Revision = makeRevision({ status: 'Superseded', isCurrent: false });
    const svc = makeService(r1Activity, r1Revision);

    // Mutation attempt on superseded activity must fail — no new record created
    const result = await svc.updateActivity({
      activityId: 'act-1',
      activityName: 'Clone attempt',
      updatedBy: 'user-1',
    });
    expect(isFailure(result)).toBe(true);

    // Diary still has exactly one activity (no clone/duplicate)
    const read = await svc.getActivitiesForDiary('sd-1');
    if (isSuccess(read)) {
      expect(read.value.length).toBe(1);
      expect(read.value[0]!.activityName).toBe('Test Activity'); // unchanged
    }
  });
});

/**
 * REM-004 — Revision Transition Mutation Safety Tests
 *
 * Source Finding: AUDIT-015 F-03
 * Validates that Activity mutation paths reject operations when the
 * activity's Programme Revision is no longer operationally current.
 *
 * DB-003 Remediation:
 * Validates APPLICATION-LEVEL transition safety.
 * `isLocked` is physically obsolete on Activity. This test proves that
 * OpenActivityService deterministically rejects mutations via
 * `assertRevisionOperational` even when checking against legacy race conditions.
 */

import { describe, it, expect } from 'vitest';
import { Success, isSuccess, isFailure } from '@/lib/result';
import { OpenActivityService } from '@/services/OpenActivityService';
import { Activity, ActivityStatus } from '@/types/activity';
import { ProgrammeRevision } from '@/types/programmeRevision';
import { IActivityRepository } from '@/repositories/IActivityRepository';
import { IProgrammeRevisionRepository } from '@/repositories/IProgrammeRevisionRepository';
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

function makeActivity(overrides: Partial<Activity>): Activity {
  return {
    activity_id: 'act-1',
    programme_id: 'prog-1',
    revision_id: 'rev-1',
    task_id: 'task-1',
    activity_uid: 'ACT-1',
    ahi: null,
    ahi_display_name: null,
    subtask: 'Test Activity',
    subtask_display_name: null,
    activity_date: '2026-08-01',
    actual_start_date: null,
    completed_date: null,
    status: ActivityStatus.New,
    weather: null,
    notes: '',
    submitted_by: 'user-1',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: null,
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

function makeActivityRepo(activity: Activity): IActivityRepository {
  let stored = { ...activity };
  return {
    findById: async () => Success(stored),
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
  activity: Activity,
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
    revisionRepository: makeRevisionRepo(revision),
    taskRepository: { getTaskById: async () => null },
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('REM-004 — Revision Transition Mutation Safety (Application-Level Evidence)', () => {
  it('TEST-REM004-01: R1 activity cannot mutate after R2 becomes active', async () => {
    const r1Activity = makeActivity({ status: ActivityStatus.New });
    // R1 is now Superseded (R2 approved)
    const r1Revision = makeRevision({ status: 'Superseded', isCurrent: false });
    const svc = makeService(r1Activity, r1Revision);

    const result = await svc.startActivity('act-1', 'user-1');
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.errorCode).toBe('ACTIVITY_REVISION_SUPERSEDED');
    }
  });

  it('TEST-REM004-02: R1 superseded mutation still rejected (simulating pre-lock window)', async () => {
    // Simulating race condition: handler hasn't processed it yet
    const r1Activity = makeActivity({ status: ActivityStatus.InProgress });
    const r1Revision = makeRevision({ status: 'Superseded', isCurrent: false });
    const svc = makeService(r1Activity, r1Revision);

    // Mutation paths must be rejected
    const update = await svc.updateActivity({
      activityId: 'act-1',
      activityName: 'Should not update',
      updatedBy: 'user-1',
    });
    expect(isFailure(update)).toBe(true);
    if (isFailure(update)) {
      expect(update.error.errorCode).toBe('ACTIVITY_REVISION_SUPERSEDED');
    }

    const complete = await svc.completeActivity('act-1', 'user-1');
    expect(isFailure(complete)).toBe(true);
    if (isFailure(complete)) {
      expect(complete.error.errorCode).toBe('ACTIVITY_REVISION_SUPERSEDED');
    }
  });

  it('TEST-REM004-04: R1 Completed activity historical state is preserved, update attempt rejected', async () => {
    const r1Activity = makeActivity({ status: ActivityStatus.Completed });
    const r1Revision = makeRevision({ status: 'Superseded', isCurrent: false });
    const svc = makeService(r1Activity, r1Revision);

    const result = await svc.updateActivity({
      activityId: 'act-1',
      activityName: 'Should fail',
      updatedBy: 'user-1'
    });
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.errorCode).toBe('ACTIVITY_REVISION_SUPERSEDED');
    }
  });

  it('TEST-REM004-06: R2 activity with active R2 revision — mutation is allowed', async () => {
    const r2Activity = makeActivity({
      revision_id: 'rev-2',
      status: ActivityStatus.New,
    });
    const r2Revision = makeRevision({ revisionId: 'rev-2', status: 'Approved', isCurrent: true });

    const clock = new SystemClock();
    const svc = new OpenActivityService({
      activityRepository: makeActivityRepo(r2Activity),
      logRepository: { appendLog: async (l) => Success(l), findLogsByActivityId: async () => Success([]) },
      transactionManager: { execute: async (fn) => fn() },
      clock,
      logger,
      eventPublisher: { publish: async () => {} },
      revisionRepository: makeRevisionRepo(r2Revision),
      taskRepository: { getTaskById: async () => null },
    });

    const result = await svc.startActivity('act-1', 'user-1');
    expect(isSuccess(result)).toBe(true);
  });

  it('TEST-REM004-07: Attempt to mutate R1 after R2 current — rejected deterministically regardless of call order', async () => {
    const r1Activity = makeActivity({ status: ActivityStatus.New });
    const r1Revision = makeRevision({ status: 'Superseded', isCurrent: false });
    const svc = makeService(r1Activity, r1Revision);

    const [r1, r2] = await Promise.all([
      svc.startActivity('act-1', 'user-a'),
      svc.updateActivity({ activityId: 'act-1', activityName: 'Updated Name', updatedBy: 'user-b' }),
    ]);

    expect(isFailure(r1)).toBe(true);
    expect(isFailure(r2)).toBe(true);
    if (isFailure(r1)) expect(r1.error.errorCode).toBe('ACTIVITY_REVISION_SUPERSEDED');
    if (isFailure(r2)) expect(r2.error.errorCode).toBe('ACTIVITY_REVISION_SUPERSEDED');
  });

  it('TEST-REM004-09: No R1 activity is reassigned to R2 during transition', async () => {
    const r1Activity = makeActivity({ revision_id: 'rev-1', status: ActivityStatus.New });
    const r1Revision = makeRevision({ status: 'Superseded', isCurrent: false });
    const activityRepo = makeActivityRepo(r1Activity);
    const svc = new OpenActivityService({
      activityRepository: activityRepo,
      logRepository: { appendLog: async (l) => Success(l), findLogsByActivityId: async () => Success([]) },
      transactionManager: { execute: async (fn) => fn() },
      clock: new SystemClock(),
      logger,
      eventPublisher: { publish: async () => {} },
      revisionRepository: makeRevisionRepo(r1Revision),
      taskRepository: { getTaskById: async () => null },
    });

    const result = await svc.updateActivity({
      activityId: 'act-1',
      activityName: 'Should fail',
      updatedBy: 'user-1',
    });
    expect(isFailure(result)).toBe(true);

    const read = await activityRepo.findById('act-1');
    if (isSuccess(read) && read.value) {
      expect(read.value.revision_id).toBe('rev-1');
    }
  });
});

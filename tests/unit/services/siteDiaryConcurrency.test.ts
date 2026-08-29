import { describe, expect, it, vi } from 'vitest';
import { SiteDiaryService } from '@/services/siteDiaryService';
import { ActivityStatus } from '@/types/activity';
import { Success, isFailure, isSuccess } from '@/lib/result';
import { SiteDiaryStaleEditError } from '@/errors/siteDiaryErrors';

const existing = {
  site_diary_id: 'sd-exact', programme_id: 'programme-1', revision_id: 'revision-1', activity_id: 'activity-1',
  activity_date: '2026-08-16', weather: null, notes: 'V1', status: ActivityStatus.InProgress, manpower: null,
  submitted_by: 'actor-1', submitted_at: '2026-08-16T08:00:00.000Z', updated_at: null,
};

function createHarness(atomicUpdate = vi.fn().mockResolvedValue({
  ...existing, notes: 'V2', updated_at: '2026-08-16T09:00:00.000Z',
})) {
  const siteDiaryRepository = {
    getSiteDiaryById: vi.fn().mockResolvedValue(existing),
    updateSiteDiary: vi.fn(),
  };
  const revisionRepository = {
    findById: vi.fn().mockResolvedValue(Success({
      revisionId: 'revision-1', programmeId: 'programme-1', revisionNumber: 1,
      revisionTitle: 'Current', isCurrent: true, status: 'Approved', createdAt: '', createdBy: '',
    })),
  };
  const atomicRepository = { updateSiteDiary: atomicUpdate };
  const service = new SiteDiaryService({
    siteDiaryRepository: siteDiaryRepository as never,
    revisionRepository: revisionRepository as never,
    atomicRepository: atomicRepository as never,
  });
  return { service, atomicUpdate, siteDiaryRepository, revisionRepository };
}

describe('SiteDiaryService optimistic concurrency', () => {
  it('forwards the exact token separately from mutation payload', async () => {
    const harness = createHarness();
    const result = await harness.service.updateSiteDiary({
      siteDiaryId: 'sd-exact', expectedLastModifiedAt: existing.submitted_at,
      notes: 'V2', updatedBy: 'actor-1',
    });
    expect(isSuccess(result)).toBe(true);
    expect(harness.atomicUpdate).toHaveBeenCalledWith(
      'sd-exact',
      expect.not.objectContaining({ expectedLastModifiedAt: expect.anything() }),
      'actor-1',
      existing.submitted_at,
    );
    expect(harness.siteDiaryRepository.updateSiteDiary).not.toHaveBeenCalled();
  });

  it('preserves the dedicated stale error from authenticated RPC to HTTP mapping', async () => {
    const harness = createHarness(vi.fn().mockRejectedValue(new SiteDiaryStaleEditError()));
    const result = await harness.service.updateSiteDiary({
      siteDiaryId: 'sd-exact', expectedLastModifiedAt: existing.submitted_at,
      notes: 'stale', updatedBy: 'actor-2',
    });
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) expect(result.error.httpStatus).toBe(409);
  });

  it('keeps historical revision rejection ahead of the atomic mutation', async () => {
    const harness = createHarness();
    harness.revisionRepository.findById = vi.fn().mockResolvedValue(Success({
      revisionId: 'revision-1', programmeId: 'programme-1', isCurrent: false, status: 'Superseded',
    }));
    const result = await harness.service.updateSiteDiary({
      siteDiaryId: 'sd-exact', expectedLastModifiedAt: existing.submitted_at,
      notes: 'forbidden', updatedBy: 'actor-1',
    });
    expect(isFailure(result)).toBe(true);
    expect(harness.atomicUpdate).not.toHaveBeenCalled();
  });
});

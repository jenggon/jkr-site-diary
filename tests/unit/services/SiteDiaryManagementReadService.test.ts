import { describe, expect, it, vi } from 'vitest';
import { ActivityStatus } from '@/types/activity';
import { SiteDiaryManagementReadRepository } from '@/repositories/SiteDiaryManagementReadRepository';
import {
  SiteDiaryManagementReadError,
  SiteDiaryManagementReadService,
} from '@/services/SiteDiaryManagementReadService';

const programmeId = '00000000-0000-4000-8000-000000000001';
const revisionId = '00000000-0000-4000-8000-000000000002';

function repository(overrides: Record<string, unknown> = {}) {
  return {
    findRevision: vi.fn().mockResolvedValue({
      revision_id: revisionId,
      programme_id: programmeId,
      revision_no: 2,
      revision_title: 'Revision 2',
      status: 'Approved',
      programme: { current_revision_id: revisionId },
    }),
    findDiaries: vi.fn().mockResolvedValue([]),
    findRevisions: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as SiteDiaryManagementReadRepository;
}

function diary(overrides: Record<string, unknown> = {}) {
  return {
    site_diary_id: 'diary-exact-identity',
    activity_id: 'activity-1',
    activity_date: '2026-08-18',
    programme_id: programmeId,
    revision_id: revisionId,
    status: ActivityStatus.Completed,
    print_context: { location: 'Pier 3', contractor_scope: 'NSC' },
    submitted_at: '2026-08-18T08:00:00.000Z',
    updated_at: null,
    activity: {
      activity_id: 'activity-1',
      source_type: 'MSP',
      task_id: 'task-1',
      vo_item_id: null,
      subtask: 'Install bearings',
      subtask_display_name: null,
      status: ActivityStatus.Completed,
      task: { task_name: 'Bridge bearings', task_uid: 42, wbs: '1.2.3' },
      vo_item: null,
    },
    ...overrides,
  };
}

describe('SiteDiaryManagementReadService', () => {
  it('projects current MSP diary identity, status, timestamps and exact diary ID', async () => {
    const repo = repository({ findDiaries: vi.fn().mockResolvedValue([diary()]) });
    const [result] = await new SiteDiaryManagementReadService(repo).list({ programmeId, revisionId });
    expect(result).toMatchObject({
      siteDiaryId: 'diary-exact-identity',
      activityId: 'activity-1',
      isCurrentRevision: true,
      isReadOnly: false,
      activityStatus: ActivityStatus.Completed,
      sourceType: 'MSP',
      activityTitle: 'Install bearings',
      sourceReference: '1.2.3',
      lastModifiedAt: '2026-08-18T08:00:00.000Z',
      enrichmentComplete: true,
    });
  });

  it('keeps completed Activity diaries readable under historical revisions and read-only', async () => {
    const repo = repository({
      findRevision: vi.fn().mockResolvedValue({
        revision_id: revisionId,
        programme_id: programmeId,
        revision_no: 1,
        revision_title: 'Superseded baseline',
        status: 'Superseded',
        programme: { current_revision_id: 'another-revision' },
      }),
      findDiaries: vi.fn().mockResolvedValue([diary()]),
    });
    const [result] = await new SiteDiaryManagementReadService(repo).list({ programmeId, revisionId });
    expect(result).toMatchObject({
      revisionStatus: 'Superseded',
      isCurrentRevision: false,
      isReadOnly: true,
      activityStatus: ActivityStatus.Completed,
    });
  });

  it('projects VO title and VO/APK reference without mixing MSP identity', async () => {
    const vo = diary({
      activity: {
        activity_id: 'activity-vo', source_type: 'VO', task_id: null, vo_item_id: 'vo-1',
        subtask: 'Additional drainage', subtask_display_name: null, status: ActivityStatus.InProgress,
        task: null,
        vo_item: { vo_reference: 'VO-17', line_item: 'APK-4', description: 'Drainage variation' },
      },
    });
    const [result] = await new SiteDiaryManagementReadService(
      repository({ findDiaries: vi.fn().mockResolvedValue([vo]) })
    ).list({ programmeId, revisionId });
    expect(result).toMatchObject({
      sourceType: 'VO', activityTitle: 'Additional drainage', sourceReference: 'VO-17 / APK-4',
      enrichmentComplete: true,
    });
  });

  it('returns explicit null fallback for missing Activity/source enrichment', async () => {
    const [result] = await new SiteDiaryManagementReadService(repository({
      findDiaries: vi.fn().mockResolvedValue([diary({ activity: null })]),
    })).list({ programmeId, revisionId });
    expect(result).toMatchObject({
      activityId: 'activity-1', activityTitle: null, activityStatus: null,
      sourceType: null, sourceReference: null, enrichmentComplete: false,
    });
  });

  it('rejects an invalid or cross-Programme revision context without querying diaries', async () => {
    const repo = repository({ findRevision: vi.fn().mockResolvedValue(null) });
    await expect(new SiteDiaryManagementReadService(repo).list({ programmeId, revisionId }))
      .rejects.toEqual(expect.objectContaining<Partial<SiteDiaryManagementReadError>>({ status: 404 }));
    expect(repo.findDiaries).not.toHaveBeenCalled();
  });

  it('supports bounded text/activity identity filtering and empty results', async () => {
    const service = new SiteDiaryManagementReadService(repository({
      findDiaries: vi.fn().mockResolvedValue([diary()]),
    }));
    await expect(service.list({ programmeId, revisionId, text: '1.2.3' })).resolves.toHaveLength(1);
    await expect(service.list({ programmeId, revisionId, text: 'not present' })).resolves.toEqual([]);
  });

  it('orders by activity date descending and equal dates by stable diary identity', async () => {
    const rows = [
      diary({ site_diary_id: 'b', activity_date: '2026-08-18' }),
      diary({ site_diary_id: 'c', activity_date: '2026-08-19' }),
      diary({ site_diary_id: 'a', activity_date: '2026-08-18' }),
    ];
    const results = await new SiteDiaryManagementReadService(repository({
      findDiaries: vi.fn().mockResolvedValue(rows),
    })).list({ programmeId, revisionId });
    expect(results.map((item) => item.siteDiaryId)).toEqual(['c', 'a', 'b']);
  });
});

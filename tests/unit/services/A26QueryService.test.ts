import { describe, expect, it, vi } from 'vitest';
import { A26QueryService } from '@/services/A26QueryService';
import { IA26ReadRepository } from '@/repositories/IA26ReadRepository';
import { ActivityStatus, ActivityWeather } from '@/types/activity';
import { Task } from '@/types/task';

const task = (overrides: Partial<Task>): Task => ({
  task_id: 'task', programme_id: 'programme', revision_id: 'revision', task_uid: 1,
  task_guid: null, wbs: null, task_name: 'Task', parent_task_uid: null, outline_level: 1,
  display_order: 1, planned_start: null, planned_finish: null, planned_duration_days: null,
  is_milestone: false, is_critical: false, is_summary: false, constraint_type: null,
  constraint_date: null, created_at: '2026-08-15T00:00:00Z', created_by: 'user', ...overrides,
});

const repository = (tasks: Task[] = []): IA26ReadRepository => ({
  findProgramme: vi.fn().mockResolvedValue({ programmeId: 'programme', currentRevisionId: 'revision' }),
  findTasksByRevision: vi.fn().mockResolvedValue(tasks),
  findSiteDiariesByDate: vi.fn().mockResolvedValue([]),
  findActivitiesByIds: vi.fn().mockResolvedValue([]),
});

describe('A26QueryService', () => {
  it('returns the preserved AHI picker projection with building context', async () => {
    const service = new A26QueryService(repository([
      task({ task_id: 'building', task_name: 'Block A', wbs: '1.2.3.4', outline_level: 4, is_summary: true }),
      task({ task_id: 'ahi', task_name: 'Concrete', wbs: '1.2.3.4.1', outline_level: 5, is_summary: true }),
    ]));
    await expect(service.getAhi('programme')).resolves.toEqual([
      { id: 'building', task_name: 'Block A', outline_number: '1.2.3.4', display_name: 'Block A', context_name: '' },
      { id: 'ahi', task_name: 'Concrete', outline_number: '1.2.3.4.1', display_name: 'Concrete | Block A', context_name: '' },
    ]);
  });

  it('returns only non-summary workpackages below the requested building', async () => {
    const service = new A26QueryService(repository([
      task({ task_id: 'match', task_name: 'Pour', wbs: '1.2.3.4.1' }),
      task({ task_id: 'summary', wbs: '1.2.3.4.2', is_summary: true }),
      task({ task_id: 'other', wbs: '1.2.9.1' }),
    ]));
    await expect(service.getWorkpackages('1.2.3.4', 'programme')).resolves.toEqual([
      { id: 'match', task_name: 'Pour', outline_number: '1.2.3.4.1', display_name: 'Pour', context_name: '' },
    ]);
  });

  it('maps the current revision root task to the legacy project-summary contract', async () => {
    const service = new A26QueryService(repository([
      task({ task_name: 'JKR Project', wbs: '0', is_summary: true,
        planned_start: '2026-01-01', planned_finish: '2026-12-31' }),
    ]));
    await expect(service.getProjectSummary('programme')).resolves.toEqual({
      task_name: 'JKR Project', start_date: '2026-01-01', finish_date: '2026-12-31', revision_id: 'revision',
    });
  });

  it('maps canonical Site Diary and Activity data to the daily-report contract and enforces distinct identity', async () => {
    const repo = repository();
    vi.mocked(repo.findSiteDiariesByDate).mockResolvedValue([{
      site_diary_id: 'diary-uuid-1', programme_id: 'programme', revision_id: 'revision', activity_id: 'activity-uuid-1',
      activity_date: '2026-08-15', weather: ActivityWeather.Morning, notes: 'Done',
      status: ActivityStatus.InProgress, manpower: [], submitted_by: 'user',
      submitted_at: '2026-08-15T08:00:00Z', updated_at: null,
    }]);
    vi.mocked(repo.findActivitiesByIds).mockResolvedValue([{
      activity_id: 'activity-uuid-1', programme_id: 'programme', revision_id: 'revision', task_id: 'task',
      activity_uid: 'uid', ahi: '1.2.3.4', ahi_display_name: 'Block A', subtask: '1.2.3.4.1',
      subtask_display_name: 'Pour', activity_date: '2026-08-15', actual_start_date: '2026-08-14',
      completed_date: null, status: ActivityStatus.InProgress, weather: ActivityWeather.Morning,
      notes: 'Done', submitted_by: 'user', created_at: '2026-08-15T08:00:00Z', updated_at: null,
    }]);
    const reports = await new A26QueryService(repo).getReports('2026-08-15');
    expect(reports).toHaveLength(1);
    const report = reports[0]!;
    expect(report.id).toBe('diary-uuid-1');
    expect(report.site_diary_id).toBe('diary-uuid-1');
    expect(report.activity_id).toBe('activity-uuid-1');
    expect(report.activityId).toBe('activity-uuid-1');
    expect(report.activityId).not.toBe(report.id);
    expect(report).toEqual(expect.objectContaining({
      id: 'diary-uuid-1', site_diary_id: 'diary-uuid-1', activityId: 'activity-uuid-1',
      activity_id: 'activity-uuid-1', project_id: 'programme', ahi: '1.2.3.4',
      ahi_name: 'Block A', subtask_name: 'Pour', work_status: 'Sedang Laksana',
      weather: 'Pagi', activity_date: '2026-08-15', notes: 'Done'
    }));
    expect(repo.findSiteDiariesByDate).toHaveBeenCalledWith('2026-08-15');
  });

  describe('current revision report safety', () => {
    it('excludes Site Diary reports belonging to a superseded revision', async () => {
      const repo = repository();
      vi.mocked(repo.findProgramme).mockResolvedValue({
        programmeId: 'programme-1',
        currentRevisionId: 'rev-current-2',
      });
      vi.mocked(repo.findSiteDiariesByDate).mockResolvedValue([{
        site_diary_id: 'diary-old', programme_id: 'programme-1', revision_id: 'rev-superseded-1',
        activity_id: 'activity-old', activity_date: '2026-08-15', weather: ActivityWeather.Morning,
        notes: 'Old revision log', status: ActivityStatus.InProgress, manpower: [],
        submitted_by: 'user', submitted_at: '2026-08-15T08:00:00Z', updated_at: null,
      }]);
      vi.mocked(repo.findActivitiesByIds).mockResolvedValue([{
        activity_id: 'activity-old', programme_id: 'programme-1', revision_id: 'rev-superseded-1',
        task_id: 'task-old', activity_uid: 'uid-old', ahi: '1.2.3', ahi_display_name: 'Block A',
        subtask: '1.2.3.1', subtask_display_name: 'Excavation', activity_date: '2026-08-15',
        actual_start_date: '2026-08-15', completed_date: null, status: ActivityStatus.InProgress,
        weather: ActivityWeather.Morning, notes: 'Old revision', submitted_by: 'user',
        created_at: '2026-08-15T08:00:00Z', updated_at: null,
      }]);

      const reports = await new A26QueryService(repo).getReports('2026-08-15');
      expect(reports).toEqual([]);
    });

    it('includes Site Diary reports when revision matches the programme current revision', async () => {
      const repo = repository();
      vi.mocked(repo.findProgramme).mockResolvedValue({
        programmeId: 'programme-1',
        currentRevisionId: 'rev-current-2',
      });
      vi.mocked(repo.findSiteDiariesByDate).mockResolvedValue([{
        site_diary_id: 'diary-current', programme_id: 'programme-1', revision_id: 'rev-current-2',
        activity_id: 'activity-current', activity_date: '2026-08-15', weather: ActivityWeather.Morning,
        notes: 'Current revision log', status: ActivityStatus.InProgress, manpower: [],
        submitted_by: 'user', submitted_at: '2026-08-15T08:00:00Z', updated_at: null,
      }]);
      vi.mocked(repo.findActivitiesByIds).mockResolvedValue([{
        activity_id: 'activity-current', programme_id: 'programme-1', revision_id: 'rev-current-2',
        task_id: 'task-curr', activity_uid: 'uid-curr', ahi: '1.2.3', ahi_display_name: 'Block A',
        subtask: '1.2.3.1', subtask_display_name: 'Excavation', activity_date: '2026-08-15',
        actual_start_date: '2026-08-15', completed_date: null, status: ActivityStatus.InProgress,
        weather: ActivityWeather.Morning, notes: 'Current revision', submitted_by: 'user',
        created_at: '2026-08-15T08:00:00Z', updated_at: null,
      }]);

      const reports = await new A26QueryService(repo).getReports('2026-08-15');
      expect(reports).toHaveLength(1);
      const report = reports[0]!;
      expect(report.site_diary_id).toBe('diary-current');
      expect(report.activityId).toBe('activity-current');
      expect(report.revision_id).toBe('rev-current-2');
    });
  });
});

import { A26ReadRepository } from '@/repositories/A26ReadRepository';
import { IA26ReadRepository } from '@/repositories/IA26ReadRepository';
import { ActivityStatus, ActivityWeather, ActivitySourceType } from '@/types/activity';
import { Task } from '@/types/task';

export const DEFAULT_PROGRAMME_ID = '0651e125-3ef4-47c4-a3fa-8aec49bdf979';

export interface TaskPickerProjection {
  readonly id: string; readonly task_name: string; readonly outline_number: string | null;
  readonly display_name: string; readonly context_name: '';
}
export interface ProjectSummaryProjection {
  readonly task_name: string; readonly start_date: string | null;
  readonly finish_date: string | null; readonly revision_id: string;
}
export interface DailyReportProjection {
  readonly id: string; readonly site_diary_id: string; readonly project_id: string;
  readonly programme_id: string; readonly revision_id: string; readonly activity_id: string;
  readonly activityId: string; readonly source_type: 'MSP' | 'VO';
  readonly task_id: string | null; readonly wbs: string; readonly task_name: string;
  readonly is_critical: boolean;
  readonly weather: string | null; readonly weather_condition: string | null;
  readonly rain_start_time: string | null; readonly rain_end_time: string | null;
  readonly actual_start_date: string | null; readonly ahi: string;
  readonly ahi_name: string; readonly ahi_display_name: string; readonly subtask: string;
  readonly subtask_name: string; readonly subtask_display_name: string; readonly work_status: string;
  readonly activity_date: string; readonly location: string;
  readonly work_start_time: string | null; readonly work_end_time: string | null;
  readonly contractor_scope: 'CONTRACTOR' | 'NSC';
  readonly manpower: unknown[]; readonly notes: string;
  readonly created_at: string; readonly submitted_by: string; readonly updated_at: string | null;
}

const taskWbs = (task: Task): string | null => task.wbs ?? task.outline_number ?? null;
const picker = (task: Task, displayName = task.task_name): TaskPickerProjection => ({
  id: task.task_id, task_name: task.task_name, outline_number: taskWbs(task),
  display_name: displayName, context_name: '',
});
const legacyStatus = (status: ActivityStatus | null): string =>
  status === ActivityStatus.InProgress ? 'Sedang Laksana' : status === ActivityStatus.Completed ? 'Siap' : 'Mula';
const legacyWeather = (weather: ActivityWeather | null): string | null =>
  weather === ActivityWeather.Morning ? 'Pagi' : weather === ActivityWeather.Afternoon ? 'Petang' :
    weather === ActivityWeather.Night ? 'Malam' : weather;

export class A26QueryService {
  public constructor(private readonly repository: IA26ReadRepository = new A26ReadRepository()) {}

  private async currentTasks(programmeId: string): Promise<{ revisionId: string; tasks: Task[] }> {
    const programme = await this.repository.findProgramme(programmeId);
    if (!programme) throw new Error(`Programme or current revision not found: ${programmeId}`);
    return { revisionId: programme.currentRevisionId,
      tasks: await this.repository.findTasksByRevision(programme.currentRevisionId) };
  }

  public async getAhi(programmeId = DEFAULT_PROGRAMME_ID): Promise<TaskPickerProjection[]> {
    const { tasks } = await this.currentTasks(programmeId);
    const summaries = tasks.filter((task) => task.is_summary === true);
    const buildings = summaries.filter((task) => task.outline_level === 4);
    return summaries.map((task) => {
      const wbs = taskWbs(task);
      const building = buildings.find((candidate) => {
        const buildingWbs = taskWbs(candidate);
        return Boolean(wbs && buildingWbs && wbs !== buildingWbs && wbs.startsWith(`${buildingWbs}.`));
      });
      return picker(task, building ? `${task.task_name} | ${building.task_name}` : task.task_name);
    });
  }

  public async getWorkpackages(building: string, programmeId = DEFAULT_PROGRAMME_ID): Promise<TaskPickerProjection[]> {
    const { tasks } = await this.currentTasks(programmeId);
    return tasks.filter((task) => task.is_summary === false && taskWbs(task)?.startsWith(`${building}.`))
      .map((task) => picker(task));
  }

  public async getProjectSummary(programmeId = DEFAULT_PROGRAMME_ID): Promise<ProjectSummaryProjection | null> {
    const { revisionId, tasks } = await this.currentTasks(programmeId);
    const root = tasks.find((task) => taskWbs(task) === '0');
    return root ? { task_name: root.task_name, start_date: root.planned_start,
      finish_date: root.planned_finish, revision_id: revisionId } : null;
  }

  public async getReports(activityDate: string): Promise<DailyReportProjection[]> {
    const diaries = await this.repository.findSiteDiariesByDate(activityDate);
    if (diaries.length === 0) return [];

    const programmeIds = [...new Set(diaries.map((d) => d.programme_id))];
    const programmeMap = new Map<string, string>();
    const taskMaps = new Map<string, Map<string, Task>>();
    await Promise.all(programmeIds.map(async (progId) => {
      const programme = await this.repository.findProgramme(progId);
      if (!programme?.currentRevisionId) return;
      programmeMap.set(progId, programme.currentRevisionId);
      const tasks = await this.repository.findTasksByRevision(programme.currentRevisionId);
      taskMaps.set(programme.currentRevisionId, new Map(tasks.map((task) => [task.task_id, task])));
    }));

    const activities = await this.repository.findActivitiesByIds([...new Set(diaries.map((d) => d.activity_id))]);
    const activityMap = new Map(activities.map((activity) => [activity.activity_id, activity]));

    return diaries.flatMap((diary) => {
      const currentRevisionId = programmeMap.get(diary.programme_id);
      if (!currentRevisionId || diary.revision_id !== currentRevisionId) return [];
      const activity = activityMap.get(diary.activity_id);
      if (!activity || activity.revision_id !== currentRevisionId) return [];
      const task = activity.task_id ? taskMaps.get(currentRevisionId)?.get(activity.task_id) : undefined;
      const ahi = activity.ahi ?? '';
      const ahiName = activity.ahi_display_name ?? ahi;
      const subtaskName = activity.subtask_display_name ?? activity.subtask;
      const printContext = diary.print_context ?? null;
      const sourceType = activity.source_type === ActivitySourceType.VO ? 'VO' : 'MSP';
      const wbs = sourceType === 'VO' ? 'VO' : (task ? taskWbs(task) ?? '' : '');
      const taskName = task?.task_name ?? subtaskName;

      return [{
        id: diary.site_diary_id, site_diary_id: diary.site_diary_id,
        project_id: diary.programme_id, programme_id: diary.programme_id,
        revision_id: diary.revision_id, activity_id: diary.activity_id, activityId: diary.activity_id,
        source_type: sourceType, task_id: activity.task_id ?? null, wbs, task_name: taskName,
        is_critical: task?.is_critical ?? false,
        weather: legacyWeather(diary.weather), weather_condition: printContext?.weather_condition ?? null,
        rain_start_time: printContext?.rain_start_time ?? null, rain_end_time: printContext?.rain_end_time ?? null,
        actual_start_date: activity.actual_start_date,
        ahi, ahi_name: ahiName, ahi_display_name: ahiName, subtask: activity.subtask,
        subtask_name: subtaskName, subtask_display_name: subtaskName,
        work_status: legacyStatus(diary.status), activity_date: diary.activity_date,
        location: printContext?.location ?? '', work_start_time: printContext?.work_start_time ?? null,
        work_end_time: printContext?.work_end_time ?? null,
        contractor_scope: printContext?.contractor_scope ?? 'CONTRACTOR',
        manpower: diary.manpower ?? [], notes: diary.notes, created_at: diary.submitted_at,
        submitted_by: diary.submitted_by, updated_at: diary.updated_at,
      }];
    });
  }
}

export const a26QueryService = new A26QueryService();

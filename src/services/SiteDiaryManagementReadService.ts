import {
  SiteDiaryManagementProjection,
  SiteDiaryManagementRevision,
} from '@/types/siteDiaryManagement';
import {
  ManagementDiaryRow,
  ManagementRevisionRow,
  SiteDiaryManagementReadRepository,
} from '@/repositories/SiteDiaryManagementReadRepository';

export class SiteDiaryManagementReadError extends Error {
  public constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export interface SiteDiaryManagementReadQuery {
  readonly programmeId: string;
  readonly revisionId: string;
  readonly text?: string | undefined;
}

function mapRevision(row: ManagementRevisionRow): SiteDiaryManagementRevision {
  const isCurrentRevision = row.programme?.current_revision_id === row.revision_id;
  return {
    programmeId: row.programme_id,
    revisionId: row.revision_id,
    revisionNumber: row.revision_no,
    revisionTitle: row.revision_title,
    revisionStatus: row.status,
    isCurrentRevision,
    isReadOnly: !isCurrentRevision || row.status !== 'Approved',
  };
}

function sourceIdentity(row: ManagementDiaryRow): {
  title: string | null;
  reference: string | null;
  complete: boolean;
} {
  const activity = row.activity;
  if (!activity) return { title: null, reference: null, complete: false };
  if (activity.source_type === 'MSP') {
    return {
      title: activity.subtask_display_name ?? activity.subtask ?? activity.task?.task_name ?? null,
      reference: activity.task?.wbs ?? (activity.task ? String(activity.task.task_uid) : null),
      complete: activity.task_id !== null && activity.vo_item_id === null && activity.task !== null,
    };
  }
  if (activity.source_type === 'VO') {
    return {
      title: activity.subtask_display_name ?? activity.subtask ?? activity.vo_item?.description ?? null,
      reference: activity.vo_item
        ? [activity.vo_item.vo_reference, activity.vo_item.line_item].filter(Boolean).join(' / ')
        : null,
      complete: activity.task_id === null && activity.vo_item_id !== null && activity.vo_item !== null,
    };
  }
  return { title: null, reference: null, complete: false };
}

export class SiteDiaryManagementReadService {
  public constructor(private readonly repository: SiteDiaryManagementReadRepository) {}

  public async list(query: SiteDiaryManagementReadQuery): Promise<SiteDiaryManagementProjection[]> {
    const revision = await this.repository.findRevision(query.programmeId, query.revisionId);
    if (!revision) {
      throw new SiteDiaryManagementReadError('Programme Revision not found in the requested Programme', 404);
    }
    const revisionProjection = mapRevision(revision);
    const rows = await this.repository.findDiaries(query.programmeId, query.revisionId);
    rows.sort((left, right) =>
      right.activity_date.localeCompare(left.activity_date)
      || left.site_diary_id.localeCompare(right.site_diary_id)
    );
    const projected = rows.map((row): SiteDiaryManagementProjection => {
      const identity = sourceIdentity(row);
      const sourceType = row.activity?.source_type === 'MSP' || row.activity?.source_type === 'VO'
        ? row.activity.source_type
        : null;
      return {
        siteDiaryId: row.site_diary_id,
        activityId: row.activity_id,
        activityDate: row.activity_date,
        programmeId: row.programme_id,
        revisionId: row.revision_id,
        revisionNumber: revisionProjection.revisionNumber,
        revisionTitle: revisionProjection.revisionTitle,
        revisionStatus: revisionProjection.revisionStatus,
        isCurrentRevision: revisionProjection.isCurrentRevision,
        isReadOnly: revisionProjection.isReadOnly,
        activityTitle: identity.title,
        activityStatus: row.activity?.status ?? null,
        sourceType,
        sourceReference: identity.reference,
        location: row.print_context?.location ?? null,
        contractorScope: row.print_context?.contractor_scope ?? null,
        diaryStatus: row.status,
        submittedAt: row.submitted_at,
        updatedAt: row.updated_at,
        lastModifiedAt: row.updated_at ?? row.submitted_at,
        enrichmentComplete: identity.complete,
      };
    });
    const search = query.text?.trim().toLocaleLowerCase();
    return search
      ? projected.filter((item) => [item.activityId, item.activityTitle, item.sourceReference]
          .some((value) => value?.toLocaleLowerCase().includes(search)))
      : projected;
  }

  public async listRevisions(programmeId: string): Promise<SiteDiaryManagementRevision[]> {
    return (await this.repository.findRevisions(programmeId)).map(mapRevision);
  }
}

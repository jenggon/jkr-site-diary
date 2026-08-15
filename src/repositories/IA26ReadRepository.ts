import { Activity } from '@/types/activity';
import { SiteDiary } from '@/types/siteDiary';
import { Task } from '@/types/task';

export interface A26ProgrammeReadModel {
  readonly programmeId: string;
  readonly currentRevisionId: string;
}

export interface IA26ReadRepository {
  findProgramme(programmeId: string): Promise<A26ProgrammeReadModel | null>;
  findTasksByRevision(revisionId: string): Promise<Task[]>;
  findSiteDiariesByDate(activityDate: string): Promise<SiteDiary[]>;
  findActivitiesByIds(activityIds: string[]): Promise<Activity[]>;
}

import { Result } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { Workforce } from '@/types/workforce';

export interface CreateWorkforceCommand {
  actor_id: string;
  programme_id: string;
  revision_id: string;
  activity_id: string;
  site_diary_id: string;
  trade_id: string;
  bumiputera_count?: number;
  non_bumiputera_count?: number;
  foreign_count?: number;
}

export interface UpdateWorkforceCommand {
  actor_id: string;
  trade_id?: string;
  bumiputera_count?: number;
  non_bumiputera_count?: number;
  foreign_count?: number;
}

export interface IWorkforceService {
  createWorkforce(cmd: CreateWorkforceCommand): Promise<Result<Workforce, BaseAppError>>;
  getWorkforceById(workforceId: string): Promise<Result<Workforce | null, BaseAppError>>;
  getWorkforceBySiteDiary(siteDiaryId: string): Promise<Result<Workforce[], BaseAppError>>;
  getWorkforceByActivity(activityId: string): Promise<Result<Workforce[], BaseAppError>>;
  updateWorkforce(workforceId: string, cmd: UpdateWorkforceCommand): Promise<Result<Workforce, BaseAppError>>;
}

import { Result } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { Progress, ProgressMeasurementStatus } from '@/types/progress';

export interface CreateProgressCommand {
  progress_id?: string;
  programme_id: string;
  revision_id: string;
  activity_id: string;
  site_diary_id: string;
  measurement_date: string;
  progress_type?: string;
  planned_quantity?: number;
  actual_quantity: number;
  unit?: string;
  progress_percentage?: number;
  measurement_status?: ProgressMeasurementStatus;
  verified_by?: string;
  verified_at?: string;
  approved_by?: string;
  approved_at?: string;
  created_at?: string;
}

export interface UpdateProgressCommand {
  actual_quantity?: number;
  progress_percentage?: number;
  measurement_status?: ProgressMeasurementStatus;
  verified_by?: string;
  verified_at?: string;
  approved_by?: string;
  approved_at?: string;
}

export interface IProgressService {
  createProgress(cmd: CreateProgressCommand, actorId?: string): Promise<Result<Progress, BaseAppError>>;
  getProgressById(progressId: string): Promise<Result<Progress | null, BaseAppError>>;
  getProgressByActivity(activityId: string): Promise<Result<Progress[], BaseAppError>>;
  getProgressBySiteDiary(siteDiaryId: string): Promise<Result<Progress[], BaseAppError>>;
  getProgressByMeasurementDate(measurementDate: string): Promise<Result<Progress[], BaseAppError>>;
  updateProgress(progressId: string, updates: UpdateProgressCommand, actorId?: string): Promise<Result<Progress, BaseAppError>>;
}

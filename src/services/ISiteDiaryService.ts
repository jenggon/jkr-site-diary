import { Result } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { SiteDiary, SiteDiaryManpower, SiteDiaryPrintContext, SiteDiaryOperationIntent } from '@/types/siteDiary';
import { ActivityWeather } from '@/types/activity';

export interface CreateSiteDiaryCommand {
  readonly programmeId: string;
  readonly revisionId: string;
  readonly activityId: string;
  readonly activityDate: string;
  readonly operationIntent: SiteDiaryOperationIntent;
  readonly weather?: ActivityWeather | null | undefined;
  readonly notes: string;
  readonly manpower?: SiteDiaryManpower[] | null | undefined;
  readonly printContext?: SiteDiaryPrintContext | null | undefined;
  readonly submittedBy: string;
}

export interface UpdateSiteDiaryCommand {
  readonly siteDiaryId: string;
  readonly expectedLastModifiedAt: string;
  readonly weather?: ActivityWeather | null | undefined;
  readonly notes?: string | undefined;
  readonly manpower?: SiteDiaryManpower[] | null | undefined;
  readonly printContext?: SiteDiaryPrintContext | null | undefined;
  readonly updatedBy: string;
}

export interface ISiteDiaryService {
  createSiteDiary(cmd: CreateSiteDiaryCommand): Promise<Result<SiteDiary, BaseAppError>>;
  getSiteDiaryById(siteDiaryId: string): Promise<Result<SiteDiary | null, BaseAppError>>;
  getSiteDiariesByActivity(activityId: string): Promise<Result<SiteDiary[], BaseAppError>>;
  getSiteDiariesByRevision(revisionId: string): Promise<Result<SiteDiary[], BaseAppError>>;
  updateSiteDiary(cmd: UpdateSiteDiaryCommand): Promise<Result<SiteDiary, BaseAppError>>;
  continueYesterday(activityId: string, targetDate: string, actorId: string): Promise<Result<SiteDiary, BaseAppError>>;
  carryForwardActiveOperations(programmeId: string, targetDate: string, actorId: string): Promise<Result<SiteDiary[], BaseAppError>>;
}

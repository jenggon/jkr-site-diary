import { Result } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { ProgrammeRevision, ProgrammeRevisionStatus } from '@/types/programmeRevision';

export interface IngestMspXmlCommand {
  readonly programmeId: string;
  readonly fileName: string;
  readonly fileBuffer: Buffer;
  readonly createdBy: string;
  readonly initialStatus?: ProgrammeRevisionStatus | undefined;
}

export interface IngestMspXmlResult {
  readonly revision: ProgrammeRevision;
  readonly taskCount: number;
  readonly fileHash: string;
}

export interface IMspIngestionService {
  ingestMspXml(cmd: IngestMspXmlCommand): Promise<Result<IngestMspXmlResult, BaseAppError>>;
}

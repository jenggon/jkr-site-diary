import crypto from 'node:crypto';
import { Result, Success, Failure, isFailure } from '@/lib/result';
import { BaseAppError, UnknownError } from '@/lib/errors';
import { Logger } from '@/lib/logger';
import { SystemClock } from '@/lib/clock';
import { generateUuid } from '@/lib/uuid';
import { ProgrammeRevision } from '@/types/programmeRevision';
import { Task } from '@/types/task';
import { ProgrammeNotFoundError } from '@/errors/programmeErrors';
import { MspDuplicateImportError, MspIngestionValidationError, MspXmlParseError } from '@/errors/mspErrors';
import { IProgrammeRepository } from '@/repositories/IProgrammeRepository';
import { IProgrammeRevisionRepository } from '@/repositories/IProgrammeRevisionRepository';
import { ITransactionManager } from '@/transactions/ITransactionManager';
import { ProgrammeRepository } from '@/repositories/ProgrammeRepository';
import { ProgrammeRevisionRepository } from '@/repositories/ProgrammeRevisionRepository';
import { DatabaseTransactionManager } from '@/transactions/DatabaseTransactionManager';
import { bulkCreateTasks as defaultBulkCreateTasks } from '@/repositories/taskRepository';
import { MspXmlParser } from './MspXmlParser';
import { MspTradeInferencer } from './MspTradeInferencer';
import { IMspIngestionService, IngestMspXmlCommand, IngestMspXmlResult } from './IMspIngestionService';
import { ResidualAtomicRepository } from '@/repositories/atomic/ResidualAtomicRepository';

export interface IMspIngestionServiceDependencies {
  readonly programmeRepository?: IProgrammeRepository;
  readonly revisionRepository?: IProgrammeRevisionRepository;
  readonly transactionManager?: ITransactionManager;
  readonly xmlParser?: MspXmlParser;
  readonly clock?: { nowIso(): string };
  readonly logger?: Logger;
  readonly bulkCreateTasksFn?: (tasks: Task[]) => Promise<Task[]>;
  readonly atomicRepository?: ResidualAtomicRepository;
}

export class MspIngestionService implements IMspIngestionService {
  private readonly programmeRepo: IProgrammeRepository;
  private readonly revisionRepo: IProgrammeRevisionRepository;
  private readonly txManager: ITransactionManager;
  private readonly xmlParser: MspXmlParser;
  private readonly clock: { nowIso(): string };
  private readonly logger: Logger;
  private readonly bulkCreateTasksFn: (tasks: Task[]) => Promise<Task[]>;
  private readonly atomicRepo: ResidualAtomicRepository | undefined;

  constructor(deps: IMspIngestionServiceDependencies = {}) {
    this.programmeRepo = deps.programmeRepository ?? new ProgrammeRepository();
    this.revisionRepo = deps.revisionRepository ?? new ProgrammeRevisionRepository();
    this.txManager = deps.transactionManager ?? new DatabaseTransactionManager();
    this.xmlParser = deps.xmlParser ?? new MspXmlParser();
    this.clock = deps.clock ?? new SystemClock();
    this.logger = deps.logger ?? new Logger({ module: 'MspIngestionService' });
    this.bulkCreateTasksFn = deps.bulkCreateTasksFn ?? defaultBulkCreateTasks;
    this.atomicRepo = deps.atomicRepository;
  }

  public async ingestMspXml(cmd: IngestMspXmlCommand): Promise<Result<IngestMspXmlResult, BaseAppError>> {
    try {
      // 1. Command Validation
      if (!cmd.programmeId || cmd.programmeId.trim() === '') {
        return Failure(new MspIngestionValidationError('Programme ID is required'));
      }
      if (!cmd.fileName || cmd.fileName.trim() === '') {
        return Failure(new MspIngestionValidationError('File name is required'));
      }
      if (!cmd.fileBuffer || cmd.fileBuffer.length === 0) {
        return Failure(new MspIngestionValidationError('File buffer cannot be empty'));
      }

      // 2. Compute SHA-256 Hash
      const fileHash = crypto.createHash('sha256').update(cmd.fileBuffer).digest('hex');

      this.logger.info('Starting MSP XML ingestion', {
        programme_id: cmd.programmeId,
        fileName: cmd.fileName,
        fileHash,
        fileSizeBytes: cmd.fileBuffer.length,
      });

      // 3. Verify Programme Exists
      const progResult = await this.programmeRepo.findById(cmd.programmeId);
      if (isFailure(progResult)) {
        return Failure(progResult.error);
      }
      if (!progResult.value) {
        return Failure(new ProgrammeNotFoundError(cmd.programmeId));
      }

      // 4. Duplicate Hash Check (Per Programme)
      const existingRevisionsResult = await this.revisionRepo.findByProgrammeId(cmd.programmeId);
      if (isFailure(existingRevisionsResult)) {
        return Failure(existingRevisionsResult.error);
      }

      const existingRevisions = existingRevisionsResult.value;
      const isDuplicateHash = existingRevisions.some(
        (rev) => rev.msp_file_hash != null && rev.msp_file_hash === fileHash
      );

      if (isDuplicateHash) {
        this.logger.warn('Duplicate MSP file hash detected for programme', {
          programme_id: cmd.programmeId,
          fileHash,
        });
        return Failure(
          new MspDuplicateImportError(`Duplicate MSP file hash '${fileHash}' detected for programme '${cmd.programmeId}'`)
        );
      }

      // 5. Parse XML
      const xmlString = cmd.fileBuffer.toString('utf-8');
      let parsedProject;
      try {
        parsedProject = this.xmlParser.parseXml(xmlString);
      } catch (err: unknown) {
        if (err instanceof BaseAppError) {
          return Failure(err);
        }
        const msg = err instanceof Error ? err.message : 'XML Parsing failed';
        return Failure(new MspXmlParseError(msg, { cause: err }));
      }

      if (!parsedProject.tasks || parsedProject.tasks.length === 0) {
        return Failure(new MspXmlParseError('MSP XML file contains zero tasks'));
      }

      // 6. Calculate Next Revision Number
      const maxRevNumber = existingRevisions.reduce(
        (max, rev) => (rev.revisionNumber > max ? rev.revisionNumber : max),
        0
      );
      const nextRevNumber = maxRevNumber + 1;
      const revisionId = generateUuid();
      const nowIsoStr = this.clock.nowIso();
      const createdBy = cmd.createdBy || 'system';

      const revision: ProgrammeRevision = {
        revisionId,
        programmeId: cmd.programmeId,
        revisionNumber: nextRevNumber,
        revisionTitle: `Ingested: ${cmd.fileName}`,
        isCurrent: false,
        status: cmd.initialStatus ?? 'Draft',
        msp_file_name: cmd.fileName,
        msp_file_hash: fileHash,
        createdAt: nowIsoStr,
        createdBy,
      };

      // 7. Canonical Task Mapping + Trade Inference
      const canonicalTasks: Task[] = parsedProject.tasks.map((pt, index) => {
        const trade = MspTradeInferencer.inferTrade(pt.taskName);
        return {
          task_id: generateUuid(),
          programme_id: cmd.programmeId,
          revision_id: revisionId,
          task_uid: pt.taskUid,
          task_guid: null,
          wbs: pt.wbs,
          task_name: pt.taskName,
          parent_task_uid: null,
          outline_level: pt.outlineLevel,
          outline_number: pt.outlineNumber ?? null,
          trade_code: trade.tradeCode ?? null,
          trade_name: trade.tradeName ?? null,
          display_order: index + 1,
          planned_start: pt.plannedStart,
          planned_finish: pt.plannedFinish,
          planned_duration_days: pt.plannedDurationDays,
          is_milestone: pt.isMilestone,
          is_critical: false,
          is_summary: pt.isSummary,
          constraint_type: null,
          constraint_date: null,
          created_at: nowIsoStr,
          created_by: createdBy,
        };
      });

      // 8. Atomic Database Transaction with Chunked Bulk Task Insertion (chunkSize = 300)
      let createdRevision: ProgrammeRevision | null = null;

      if (this.atomicRepo) {
        createdRevision = await this.atomicRepo.ingestMsp({
          revision_id: revision.revisionId,
          programme_id: revision.programmeId,
          revision_no: revision.revisionNumber,
          revision_name: revision.revisionTitle,
          msp_file_name: revision.msp_file_name,
          msp_file_hash: revision.msp_file_hash,
          status: revision.status,
        }, canonicalTasks, createdBy);
        return Success({ revision: createdRevision, taskCount: canonicalTasks.length, fileHash });
      }

      const txResult = await this.txManager.execute(async () => {
        const revResult = await this.revisionRepo.create(revision);
        if (isFailure(revResult)) {
          return Failure(revResult.error);
        }
        createdRevision = revResult.value;

        // Chunk bulk task insertion
        const chunkSize = 300;
        for (let i = 0; i < canonicalTasks.length; i += chunkSize) {
          const chunk = canonicalTasks.slice(i, i + chunkSize);
          await this.bulkCreateTasksFn(chunk);
        }

        return Success(createdRevision);
      });

      if (isFailure(txResult)) {
        this.logger.error('Failed to execute MSP ingestion transaction', { error: txResult.error });
        return Failure(txResult.error);
      }

      this.logger.info('MSP XML Ingestion completed successfully', {
        revisionId: createdRevision!.revisionId,
        revisionNumber: nextRevNumber,
        taskCount: canonicalTasks.length,
      });

      return Success({
        revision: createdRevision!,
        taskCount: canonicalTasks.length,
        fileHash,
      });
    } catch (err: unknown) {
      this.logger.error('Unexpected error during MSP ingestion', { error: err });
      const msg = err instanceof Error ? err.message : 'Unexpected ingestion error';
      return Failure(new UnknownError(msg, { cause: err }));
    }
  }
}

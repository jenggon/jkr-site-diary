import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import { MspXmlParser } from '@/services/MspXmlParser';
import { MspTradeInferencer } from '@/services/MspTradeInferencer';
import { MspIngestionService } from '@/services/MspIngestionService';
import { ProgramKerjaBoundaryService } from '@/services/ProgramKerjaBoundaryService';
import { Success, isSuccess, isFailure } from '@/lib/result';
import { Programme } from '@/types/programme';
import { ProgrammeRevision } from '@/types/programmeRevision';
import { Task } from '@/types/task';
import { SystemClock } from '@/lib/clock';
import { Logger } from '@/lib/logger';
import { IProgrammeRepository } from '@/repositories/IProgrammeRepository';
import { IProgrammeRevisionRepository } from '@/repositories/IProgrammeRevisionRepository';
import { ITransactionManager } from '@/transactions/ITransactionManager';

describe('S1 MSP Ingestion Unit Test Suite', () => {
  const clock = new SystemClock();
  const logger = new Logger({ module: 'Test' });

  const sampleXmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <Name>Test Project</Name>
  <Tasks>
    <Task>
      <UID>1</UID>
      <ID>1</ID>
      <Name>Project Root Summary</Name>
      <OutlineNumber>0</OutlineNumber>
      <OutlineLevel>0</OutlineLevel>
      <WBS>0</WBS>
      <Summary>1</Summary>
    </Task>
    <Task>
      <UID>10</UID>
      <ID>2</ID>
      <Name>Kerja Konkrit Pad Footing</Name>
      <OutlineNumber>1.1</OutlineNumber>
      <OutlineLevel>2</OutlineLevel>
      <WBS>1.1</WBS>
      <Start>2026-09-01T08:00:00</Start>
      <Finish>2026-09-10T17:00:00</Finish>
      <Duration>PT80H0M0S</Duration>
      <Milestone>0</Milestone>
      <Summary>0</Summary>
    </Task>
    <Task>
      <UID>20</UID>
      <ID>3</ID>
      <Name>Pasang Acuan Kayu</Name>
      <OutlineNumber>1.2</OutlineNumber>
      <OutlineLevel>2</OutlineLevel>
      <WBS>1.2</WBS>
      <Start>2026-09-11T08:00:00</Start>
      <Finish>2026-09-15T17:00:00</Finish>
      <Duration>PT40H0M0S</Duration>
      <Milestone>0</Milestone>
      <Summary>0</Summary>
    </Task>
    <Task>
      <UID>30</UID>
      <ID>4</ID>
      <Name>Milestone Selesai Tapak</Name>
      <OutlineNumber>1.3</OutlineNumber>
      <OutlineLevel>2</OutlineLevel>
      <WBS>1.3</WBS>
      <Start>2026-09-15T17:00:00</Start>
      <Finish>2026-09-15T17:00:00</Finish>
      <Duration>PT0H0M0S</Duration>
      <Milestone>1</Milestone>
      <Summary>0</Summary>
    </Task>
  </Tasks>
</Project>`;

  describe('Phase 2 & 3: MspXmlParser', () => {
    it('1. Parses valid minimal MSP XML correctly', () => {
      const parser = new MspXmlParser();
      const result = parser.parseXml(sampleXmlContent);

      expect(result.projectName).toBe('Test Project');
      expect(result.tasks.length).toBe(4);
    });

    it('2-11. Correctly maps UID, WBS, OutlineNumber, Level, Start, Finish, Duration, Milestone, Summary', () => {
      const parser = new MspXmlParser();
      const result = parser.parseXml(sampleXmlContent);

      const task10 = result.tasks.find((t) => t.taskUid === 10);
      expect(task10).toBeDefined();
      expect(task10?.taskName).toBe('Kerja Konkrit Pad Footing');
      expect(task10?.wbs).toBe('1.1');
      expect(task10?.outlineNumber).toBe('1.1');
      expect(task10?.outlineLevel).toBe(2);
      expect(task10?.plannedStart).toBe(new Date('2026-09-01T08:00:00').toISOString());
      expect(task10?.plannedFinish).toBe(new Date('2026-09-10T17:00:00').toISOString());
      expect(task10?.plannedDurationDays).toBe(10); // PT80H / 8 = 10 days
      expect(task10?.isMilestone).toBe(false);
      expect(task10?.isSummary).toBe(false);

      const milestoneTask = result.tasks.find((t) => t.taskUid === 30);
      expect(milestoneTask?.isMilestone).toBe(true);

      const summaryTask = result.tasks.find((t) => t.taskUid === 1);
      expect(summaryTask?.isSummary).toBe(true);
    });

    it('14. Throws MspXmlParseError on malformed XML', () => {
      const parser = new MspXmlParser();
      expect(() => parser.parseXml('<<<INVALID_XML>>>')).toThrowError('Missing required <Project>');
    });

    it('15. Throws MspXmlParseError when <Project> root is missing', () => {
      const parser = new MspXmlParser();
      expect(() => parser.parseXml('<InvalidRoot><Tasks></Tasks></InvalidRoot>')).toThrowError('Missing required <Project>');
    });

    it('16. Throws MspXmlParseError when <Tasks> is missing', () => {
      const parser = new MspXmlParser();
      expect(() => parser.parseXml('<Project><Name>No Tasks</Name></Project>')).toThrowError('Missing required <Tasks>');
    });

    it('17. Throws MspXmlParseError when duplicate Task.UID is present in same XML file', () => {
      const parser = new MspXmlParser();
      const duplicateUidXml = `<Project><Tasks>
        <Task><UID>10</UID><Name>Task A</Name></Task>
        <Task><UID>10</UID><Name>Task B Duplicate</Name></Task>
      </Tasks></Project>`;

      expect(() => parser.parseXml(duplicateUidXml)).toThrowError('Duplicate Task.UID \'10\'');
    });
  });

  describe('Phase 4: MspTradeInferencer', () => {
    it('12. Infers trades deterministically from task keywords', () => {
      expect(MspTradeInferencer.inferTrade('Kerja Konkrit')).toEqual({
        tradeCode: 'CONCRETOR',
        tradeName: 'Concrete Specialist',
      });

      expect(MspTradeInferencer.inferTrade('Pasang Acuan Kayu')).toEqual({
        tradeCode: 'CARPENTER',
        tradeName: 'Formwork Carpenter',
      });

      expect(MspTradeInferencer.inferTrade('Ikut Tetulang Steel Rebar')).toEqual({
        tradeCode: 'BAR_BENDER',
        tradeName: 'Bar Bender',
      });

      expect(MspTradeInferencer.inferTrade('Pasang Paip Cold Water')).toEqual({
        tradeCode: 'PLUMBER',
        tradeName: 'Plumbing Specialist',
      });

      expect(MspTradeInferencer.inferTrade('Kerja Cat Dinding')).toEqual({
        tradeCode: 'PAINTER',
        tradeName: 'Painting Specialist',
      });
    });

    it('13. Returns null/null for unrecognized task names', () => {
      expect(MspTradeInferencer.inferTrade('Pembersihan Tapak')).toEqual({
        tradeCode: null,
        tradeName: null,
      });
    });
  });

  describe('Phase 5-15: MspIngestionService', () => {
    const mockProgramme: Programme = {
      programmeId: 'prog-1',
      programmeCode: 'PRG001',
      programmeName: 'Test Programme',
      status: 'Active',
      isLocked: false,
      createdAt: clock.nowIso(),
      createdBy: 'test-user',
    };

    it('18 & 20. Ingests valid MSP XML, computes hash, creates Draft revision and canonical tasks', async () => {
      const mockProgRepo = {
        findById: async () => Success(mockProgramme),
      } as unknown as IProgrammeRepository;

      const mockRevRepo = {
        findByProgrammeId: async () => Success([]),
        create: async (rev: ProgrammeRevision) => Success(rev),
      } as unknown as IProgrammeRevisionRepository;

      const createdTasks: Task[] = [];
      const mockTxManager = {
        execute: async (work: () => Promise<unknown>) => work(),
      } as unknown as ITransactionManager;

      const bulkCreateFn = async (chunk: Task[]) => {
        createdTasks.push(...chunk);
        return chunk;
      };

      const service = new MspIngestionService({
        programmeRepository: mockProgRepo,
        revisionRepository: mockRevRepo,
        transactionManager: mockTxManager,
        clock,
        logger,
        bulkCreateTasksFn: bulkCreateFn,
      });

      const result = await service.ingestMspXml({
        programmeId: 'prog-1',
        fileName: 'test.xml',
        fileBuffer: Buffer.from(sampleXmlContent, 'utf-8'),
        createdBy: 'ingest-user',
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value.revision.programmeId).toBe('prog-1');
        expect(result.value.revision.revisionNumber).toBe(1);
        expect(result.value.revision.status).toBe('Draft');
        expect(result.value.revision.msp_file_name).toBe('test.xml');
        expect(result.value.fileHash).toHaveLength(64);
        expect(result.value.taskCount).toBe(4);
      }

      // Check task mapping
      expect(createdTasks.length).toBe(4);
      const concreteTask = createdTasks.find((t) => t.task_uid === 10);
      expect(concreteTask?.trade_code).toBe('CONCRETOR');
      expect(concreteTask?.trade_name).toBe('Concrete Specialist');
      expect(concreteTask?.outline_number).toBe('1.1');
    });

    it('18. Rejects duplicate file hash for the same programme', async () => {
      const crypto = await import('node:crypto');
      const exactHash = crypto.createHash('sha256').update(sampleXmlContent).digest('hex');

      const existingRev: ProgrammeRevision = {
        revisionId: 'rev-existing',
        programmeId: 'prog-1',
        revisionNumber: 1,
        revisionTitle: 'Rev 1',
        isCurrent: true,
        status: 'Approved',
        msp_file_hash: exactHash,
        createdAt: clock.nowIso(),
        createdBy: 'user',
      };

      const mockProgRepo = {
        findById: async () => Success(mockProgramme),
      } as unknown as IProgrammeRepository;

      const mockRevRepo = {
        findByProgrammeId: async () => Success([existingRev]),
      } as unknown as IProgrammeRevisionRepository;

      const service = new MspIngestionService({
        programmeRepository: mockProgRepo,
        revisionRepository: mockRevRepo,
        clock,
        logger,
      });

      const result = await service.ingestMspXml({
        programmeId: 'prog-1',
        fileName: 'duplicate.xml',
        fileBuffer: Buffer.from(sampleXmlContent, 'utf-8'),
        createdBy: 'user',
      });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.errorCode).toBe('MSP_DUPLICATE_IMPORT');
      }
    });

    it('19. Allows same file hash for a DIFFERENT programme', async () => {
      const mockProgRepo = {
        findById: async () => Success({ ...mockProgramme, programmeId: 'prog-2' }),
      } as unknown as IProgrammeRepository;

      // Revisions for prog-2 are empty
      const mockRevRepo = {
        findByProgrammeId: async () => Success([]),
        create: async (rev: ProgrammeRevision) => Success(rev),
      } as unknown as IProgrammeRevisionRepository;

      const mockTxManager = { execute: async (work: () => Promise<unknown>) => work() } as unknown as ITransactionManager;
      const bulkCreateFn = async (chunk: Task[]) => chunk;

      const service = new MspIngestionService({
        programmeRepository: mockProgRepo,
        revisionRepository: mockRevRepo,
        transactionManager: mockTxManager,
        clock,
        logger,
        bulkCreateTasksFn: bulkCreateFn,
      });

      const result = await service.ingestMspXml({
        programmeId: 'prog-2',
        fileName: 'same.xml',
        fileBuffer: Buffer.from(sampleXmlContent, 'utf-8'),
        createdBy: 'user',
      });

      expect(isSuccess(result)).toBe(true);
    });

    it('23. Uses chunked bulk task insertion for large task sets', async () => {
      const mockProgRepo = { findById: async () => Success(mockProgramme) } as unknown as IProgrammeRepository;
      const mockRevRepo = {
        findByProgrammeId: async () => Success([]),
        create: async (rev: ProgrammeRevision) => Success(rev),
      } as unknown as IProgrammeRevisionRepository;
      const mockTxManager = { execute: async (work: () => Promise<unknown>) => work() } as unknown as ITransactionManager;

      const chunkCalls: number[] = [];
      const bulkCreateFn = async (chunk: Task[]) => {
        chunkCalls.push(chunk.length);
        return chunk;
      };

      // Generate 750 dummy tasks XML
      let largeTasksXml = '';
      for (let i = 1; i <= 750; i++) {
        largeTasksXml += `<Task><UID>${i}</UID><Name>Task ${i}</Name></Task>\n`;
      }
      const largeXml = `<Project><Tasks>${largeTasksXml}</Tasks></Project>`;

      const service = new MspIngestionService({
        programmeRepository: mockProgRepo,
        revisionRepository: mockRevRepo,
        transactionManager: mockTxManager,
        clock,
        logger,
        bulkCreateTasksFn: bulkCreateFn,
      });

      const result = await service.ingestMspXml({
        programmeId: 'prog-1',
        fileName: 'large.xml',
        fileBuffer: Buffer.from(largeXml, 'utf-8'),
        createdBy: 'user',
      });

      expect(isSuccess(result)).toBe(true);
      // 750 tasks with chunkSize = 300 -> chunks of 300, 300, 150
      expect(chunkCalls).toEqual([300, 300, 150]);
    });

    it('24. ProgramKerjaBoundary resolves ingested tasks for TRE trade recommendations', async () => {
      const createdTasks: Task[] = [];
      const mockProgRepo = { findById: async () => Success(mockProgramme) } as unknown as IProgrammeRepository;
      const mockRevRepo = {
        findByProgrammeId: async () => Success([]),
        create: async (rev: ProgrammeRevision) => Success(rev),
      } as unknown as IProgrammeRevisionRepository;
      const mockTxManager = { execute: async (work: () => Promise<unknown>) => work() } as unknown as ITransactionManager;
      const bulkCreateFn = async (chunk: Task[]) => {
        createdTasks.push(...chunk);
        return chunk;
      };

      const service = new MspIngestionService({
        programmeRepository: mockProgRepo,
        revisionRepository: mockRevRepo,
        transactionManager: mockTxManager,
        clock,
        logger,
        bulkCreateTasksFn: bulkCreateFn,
      });

      const res = await service.ingestMspXml({
        programmeId: 'prog-1',
        fileName: 'test.xml',
        fileBuffer: Buffer.from(sampleXmlContent, 'utf-8'),
        createdBy: 'user',
      });

      expect(isSuccess(res)).toBe(true);
      if (!isSuccess(res)) return;

      const revisionId = res.value.revision.revisionId;

      // Mock taskRepository for boundary service using ingested tasks
      const mockTaskRepo = {
        getTaskById: async (taskId: string) => createdTasks.find((t) => t.task_id === taskId) ?? null,
      };

      const mockRevisionRepo = {
        findById: async (revId: string) =>
          revId === revisionId ? Success({ ...res.value.revision, status: 'Approved' }) : Success(null),
      };

      const boundary = new ProgramKerjaBoundaryService({
        taskRepository: mockTaskRepo as unknown as NonNullable<ConstructorParameters<typeof ProgramKerjaBoundaryService>[0]>['taskRepository'],
        revisionRepository: mockRevisionRepo as unknown as IProgrammeRevisionRepository,
      });

      const ingestedConcreteTask = createdTasks.find((t) => t.task_uid === 10);
      expect(ingestedConcreteTask).toBeDefined();

      const boundaryTrade = await boundary.getProgramKerjaTrade('prog-1', revisionId, ingestedConcreteTask!.task_id);
      expect(boundaryTrade).toBeDefined();
      expect(boundaryTrade?.tradeCode).toBe('CONCRETOR');
      expect(boundaryTrade?.tradeName).toBe('Concrete Specialist');
    });
  });

  describe('Phase 16 Fixture Test: samples/fptv-upsi-rev00.xml', () => {
    it('26. Parses official 95 MB sample MSP XML fixture cleanly', () => {
      const fixturePath = path.join(process.cwd(), 'samples', 'fptv-upsi-rev00.xml');
      if (!fs.existsSync(fixturePath)) {
        console.warn('Sample fixture not found, skipping fixture test');
        return;
      }

      const xmlContent = fs.readFileSync(fixturePath, 'utf-8');
      const parser = new MspXmlParser();
      const result = parser.parseXml(xmlContent);

      expect(result.projectName).toBeDefined();
      expect(result.tasks.length).toBeGreaterThan(1000);

      // Verify trade inference on parsed fixture tasks if keyword matching task exists
      const taskWithKeyword = result.tasks.find((t) =>
        ['konkrit', 'concrete', 'tetulang', 'rebar', 'acuan', 'formwork', 'paip', 'cat'].some((k) =>
          t.taskName.toLowerCase().includes(k)
        )
      );
      if (taskWithKeyword) {
        const trade = MspTradeInferencer.inferTrade(taskWithKeyword.taskName);
        expect(trade.tradeCode).not.toBeNull();
      }
    }, 60000);
  });
});

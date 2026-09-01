import { describe, it, expect, vi } from 'vitest';
import { ProgrammeService } from '@/services/ProgrammeService';
import { IProgrammeRepository } from '@/repositories/IProgrammeRepository';
import { IProgrammeRevisionRepository } from '@/repositories/IProgrammeRevisionRepository';
import { ITransactionManager } from '@/transactions/ITransactionManager';
import { IClock } from '@/lib/IClock';
import { Logger } from '@/lib/logger';
import { IDomainEventPublisher, IDomainEvent } from '@/events/IDomainEventPublisher';
import { Result, Success, isSuccess, isFailure } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { Programme } from '@/types/programme';
import { ProgrammeRevision } from '@/types/programmeRevision';

describe('ProgrammeService', () => {
  const mockClock: IClock = {
    nowIso: () => '2026-08-07T12:00:00.000Z',
    nowUtcDate: () => new Date('2026-08-07T12:00:00.000Z'),
  };

  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: () => mockLogger,
  } as unknown as Logger;

  const mockTxManager: ITransactionManager = {
    execute: async <T>(work: () => Promise<Result<T, BaseAppError>>) => work(),
  };

  const mockEventPublisher: IDomainEventPublisher = {
    publish: vi.fn(async (_event: IDomainEvent) => {}),
  };

  const sampleProgramme: Programme = {
    programmeId: 'p1',
    programmeCode: 'JKR/PLS/2026/001',
    programmeName: 'Projek Lebuhraya',
    programmeShortName: 'PLS 001',
    status: 'Active',
    isLocked: false,
    createdAt: '2026-08-07T12:00:00.000Z',
    createdBy: 'u1',
  };

  const sampleRevision: ProgrammeRevision = {
    revisionId: 'r1',
    programmeId: 'p1',
    revisionNumber: 1,
    revisionTitle: 'Baseline Revision',
    isCurrent: true,
    status: 'UnderReview',
    createdAt: '2026-08-07T12:00:00.000Z',
    createdBy: 'u1',
  };

  function createService(overrides?: {
    progRepo?: Partial<IProgrammeRepository>;
    revRepo?: Partial<IProgrammeRevisionRepository>;
    txManager?: ITransactionManager;
    eventPublisher?: IDomainEventPublisher;
  }) {
    const programmeRepo: IProgrammeRepository = {
      findById: async () => Success(sampleProgramme),
      findByCode: async () => Success(sampleProgramme),
      findAll: async () => Success([sampleProgramme]),
      existsByCode: async () => Success(false),
      create: async (p) => Success(p),
      update: async (p) => Success(p),
      archive: async (id) => Success({ ...sampleProgramme, status: 'Archived', programmeId: id }),
      setCurrentRevision: async () => Success(undefined),
      setLockStatus: async () => Success(undefined),
      ...overrides?.progRepo,
    };

    const revisionRepo: IProgrammeRevisionRepository = {
      findById: async () => Success(sampleRevision),
      findByProgrammeId: async () => Success([sampleRevision]),
      findActiveRevision: async () => Success(sampleRevision),
      create: async (r) => Success(r),
      updateStatus: async (id, status) => Success({ ...sampleRevision, revisionId: id, status }),
      ...overrides?.revRepo,
    };

    return new ProgrammeService({
      programmeRepository: programmeRepo,
      revisionRepository: revisionRepo,
      transactionManager: overrides?.txManager ?? mockTxManager,
      clock: mockClock,
      logger: mockLogger,
      eventPublisher: overrides?.eventPublisher ?? mockEventPublisher,
    });
  }

  it('should create a programme and baseline revision successfully', async () => {
    const service = createService();
    const result = await service.createProgramme({
      programmeCode: 'JKR/PLS/2026/002',
      programmeName: 'Projek Baru',
      programmeShortName: 'PLS 002',
      createdBy: 'u1',
    });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.programmeCode).toBe('JKR/PLS/2026/002');
      expect(result.value.programmeShortName).toBe('PLS 002');
    }
  });

  it('should fail createProgramme if code already exists', async () => {
    const service = createService({
      progRepo: { existsByCode: async () => Success(true) },
    });

    const result = await service.createProgramme({
      programmeCode: 'JKR/PLS/2026/001',
      programmeName: 'Projek Wujud',
      programmeShortName: 'PLS 001',
      createdBy: 'u1',
    });

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.errorCode).toBe('PROGRAMME_ALREADY_EXISTS');
    }
  });

  it('should reject an invalid short name before persistence', async () => {
    const service = createService();
    const result = await service.createProgramme({
      programmeCode: 'JKR/PLS/2026/003',
      programmeName: 'Projek Baru',
      programmeShortName: 'TOO__NOISY',
      createdBy: 'u1',
    });

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.errorCode).toBe('PROGRAMME_VALIDATION_FAILED');
    }
  });

  it('should approve revision and publish event post-commit', async () => {
    const service = createService();
    const result = await service.approveRevision('r1', 'u1');

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.status).toBe('Approved');
    }
  });

  it('should swallow event publisher error and still return Success', async () => {
    const failingPublisher: IDomainEventPublisher = {
      publish: async () => {
        throw new Error('Event bus down');
      },
    };

    const service = createService({ eventPublisher: failingPublisher });
    const result = await service.approveRevision('r1', 'u1');

    expect(isSuccess(result)).toBe(true);
  });

  it('should fail update on locked programme', async () => {
    const service = createService({
      progRepo: { findById: async () => Success({ ...sampleProgramme, isLocked: true }) },
    });

    const result = await service.updateProgramme({
      programmeId: 'p1',
      programmeName: 'Nama Baru',
      updatedBy: 'u1',
    });

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.errorCode).toBe('PROGRAMME_LOCKED');
    }
  });
});

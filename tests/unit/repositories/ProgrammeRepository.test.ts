import { describe, it, expect } from 'vitest';
import { ProgrammeRepository } from '@/repositories/ProgrammeRepository';
import { IDatabaseAdapter } from '@/repositories/adapters/IDatabaseAdapter';
import { ProgrammeRowMapper } from '@/repositories/mappers/ProgrammeRowMapper';
import { Success, Failure, isSuccess, isFailure } from '@/lib/result';
import { InfrastructureError } from '@/lib/errors';
import { Programme } from '@/types/programme';

describe('ProgrammeRepository', () => {
  const mapper = new ProgrammeRowMapper();

  const mockProgramme: Programme = {
    programmeId: 'p1',
    programmeCode: 'JKR/PLS/2026/001',
    programmeName: 'Test Programme',
    status: 'Active',
    isLocked: false,
    createdAt: '2026-08-07T12:00:00.000Z',
    createdBy: 'u1',
  };

  it('should find programme by ID using DatabaseAdapter', async () => {
    const mockRow = mapper.toRow(mockProgramme);
    const mockAdapter: IDatabaseAdapter = {
      selectOne: async <T>() => Success(mockRow as unknown as T),
      selectMany: async <T>() => Success([] as T[]),
      insert: async <T>() => Success({} as T),
      update: async <T>() => Success({} as T),
      exists: async () => Success(true),
    };

    const repo = new ProgrammeRepository(mockAdapter, mapper);
    const result = await repo.findById('p1');

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value?.programmeId).toBe('p1');
    }
  });

  it('should handle findById error via Failure ADT', async () => {
    const mockAdapter: IDatabaseAdapter = {
      selectOne: async () => Failure(new InfrastructureError('DB Error')),
      selectMany: async () => Success([]),
      insert: async () => Failure(new InfrastructureError('DB Error')),
      update: async () => Failure(new InfrastructureError('DB Error')),
      exists: async () => Success(false),
    };

    const repo = new ProgrammeRepository(mockAdapter, mapper);
    const result = await repo.findById('p1');

    expect(isFailure(result)).toBe(true);
  });

  it('should create new programme entity', async () => {
    const mockRow = mapper.toRow(mockProgramme);
    const mockAdapter: IDatabaseAdapter = {
      selectOne: async () => Success(null),
      selectMany: async <T>() => Success([] as T[]),
      insert: async <T>() => Success(mockRow as unknown as T),
      update: async <T>() => Success({} as T),
      exists: async () => Success(false),
    };

    const repo = new ProgrammeRepository(mockAdapter, mapper);
    const result = await repo.create(mockProgramme);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.programmeCode).toBe('JKR/PLS/2026/001');
    }
  });

  it('should archive programme entity', async () => {
    const archivedProgramme = { ...mockProgramme, status: 'Archived' as const };
    const mockRow = mapper.toRow(archivedProgramme);
    const mockAdapter: IDatabaseAdapter = {
      selectOne: async () => Success(null),
      selectMany: async <T>() => Success([] as T[]),
      insert: async <T>() => Success({} as T),
      update: async <T>() => Success(mockRow as unknown as T),
      exists: async () => Success(false),
    };

    const repo = new ProgrammeRepository(mockAdapter, mapper);
    const result = await repo.archive('p1', 'u1');

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.status).toBe('Archived');
    }
  });
});

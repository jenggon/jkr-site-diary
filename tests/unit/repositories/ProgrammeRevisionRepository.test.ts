import { describe, it, expect } from 'vitest';
import { ProgrammeRevisionRepository } from '@/repositories/ProgrammeRevisionRepository';
import { IDatabaseAdapter } from '@/repositories/adapters/IDatabaseAdapter';
import { ProgrammeRowMapper } from '@/repositories/mappers/ProgrammeRowMapper';
import { Success, isSuccess } from '@/lib/result';
import { ProgrammeRevision } from '@/types/programmeRevision';

describe('ProgrammeRevisionRepository', () => {
  const mapper = new ProgrammeRowMapper();

  const mockRevision: ProgrammeRevision = {
    revisionId: 'r1',
    programmeId: 'p1',
    revisionNumber: 1,
    revisionTitle: 'Initial',
    isCurrent: true,
    status: 'Approved',
    createdAt: '2026-08-07T12:00:00.000Z',
    createdBy: 'u1',
  };

  it('should find active revision by programme ID', async () => {
    const mockRow = mapper.toRevisionRow(mockRevision);
    const mockAdapter: IDatabaseAdapter = {
      selectOne: async <T>() => Success(mockRow as unknown as T),
      selectMany: async <T>() => Success([] as T[]),
      insert: async <T>() => Success({} as T),
      update: async <T>() => Success({} as T),
      exists: async () => Success(true),
    };

    const repo = new ProgrammeRevisionRepository(mockAdapter, mapper);
    const result = await repo.findActiveRevision('p1');

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value?.revisionId).toBe('r1');
      expect(result.value?.isCurrent).toBe(true);
    }
  });

  it('should update revision status correctly', async () => {
    const approvedRevision = { ...mockRevision, status: 'Approved' as const };
    const mockRow = mapper.toRevisionRow(approvedRevision);
    const mockAdapter: IDatabaseAdapter = {
      selectOne: async () => Success(null),
      selectMany: async <T>() => Success([] as T[]),
      insert: async <T>() => Success({} as T),
      update: async <T>() => Success(mockRow as unknown as T),
      exists: async () => Success(true),
    };

    const repo = new ProgrammeRevisionRepository(mockAdapter, mapper);
    const result = await repo.updateStatus('r1', 'Approved', 'u1');

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.status).toBe('Approved');
    }
  });
});

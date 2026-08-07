import { describe, it, expect } from 'vitest';
import { ProgrammeRepository } from '@/repositories/ProgrammeRepository';
import { ProgrammeRowMapper } from '@/repositories/mappers/ProgrammeRowMapper';
import { IDatabaseAdapter } from '@/repositories/adapters/IDatabaseAdapter';
import { withTransaction } from '@/lib/db';
import { isSuccess, isFailure, Success, Failure } from '@/lib/result';
import { ProgrammeAlreadyExistsError, ProgrammeNotFoundError } from '@/errors/programmeErrors';
import { Programme } from '@/types/programme';

describe('ProgrammeRepository Integration Scenarios', () => {
  const mapper = new ProgrammeRowMapper();

  const mockDbState: Map<string, Record<string, unknown>> = new Map();

  const mockAdapter: IDatabaseAdapter = {
    selectOne: async <T>(table: string, filter: Record<string, unknown>) => {
      for (const item of mockDbState.values()) {
        let match = true;
        for (const [k, v] of Object.entries(filter)) {
          if (item[k] !== v) match = false;
        }
        if (match) return Success(item as T);
      }
      return Success(null);
    },

    selectMany: async <T>(table: string, filter?: Record<string, unknown>) => {
      const results: T[] = [];
      for (const item of mockDbState.values()) {
        let match = true;
        if (filter) {
          for (const [k, v] of Object.entries(filter)) {
            if (item[k] !== v) match = false;
          }
        }
        if (match) results.push(item as T);
      }
      return Success(results);
    },

    insert: async <T>(table: string, row: Record<string, unknown>) => {
      const code = row.programme_code as string;
      for (const existing of mockDbState.values()) {
        if (existing.programme_code === code) {
          return Failure(new ProgrammeAlreadyExistsError(`Duplicate code: ${code}`));
        }
      }
      const id = (row.programme_id ?? row.revision_id ?? `id_${Date.now()}`) as string;
      const stored = { ...row, programme_id: id };
      mockDbState.set(id, stored);
      return Success(stored as T);
    },

    update: async <T>(table: string, filter: Record<string, unknown>, updates: Record<string, unknown>) => {
      const id = filter.programme_id as string;
      const existing = mockDbState.get(id);
      if (!existing) {
        return Failure(new ProgrammeNotFoundError('Not found'));
      }
      const updated = { ...existing, ...updates };
      mockDbState.set(id, updated);
      return Success(updated as T);
    },

    exists: async (table: string, filter: Record<string, unknown>) => {
      const code = filter.programme_code as string;
      for (const item of mockDbState.values()) {
        if (item.programme_code === code) return Success(true);
      }
      return Success(false);
    },
  };

  const repo = new ProgrammeRepository(mockAdapter, mapper);

  it('should support create(), findById(), findByCode(), and existsByCode()', async () => {
    const programme: Programme = {
      programmeId: 'p-100',
      programmeCode: 'JKR/PLS/2026/100',
      programmeName: 'Projek Lebuhraya Perlis',
      status: 'Active',
      isLocked: false,
      createdAt: '2026-08-07T12:00:00.000Z',
      createdBy: 'u1',
    };

    const createRes = await repo.create(programme);
    expect(isSuccess(createRes)).toBe(true);

    const existsRes = await repo.existsByCode('JKR/PLS/2026/100');
    expect(isSuccess(existsRes)).toBe(true);
    if (isSuccess(existsRes)) {
      expect(existsRes.value).toBe(true);
    }

    const byIdRes = await repo.findById('p-100');
    expect(isSuccess(byIdRes)).toBe(true);
    if (isSuccess(byIdRes)) {
      expect(byIdRes.value?.programmeCode).toBe('JKR/PLS/2026/100');
    }

    const byCodeRes = await repo.findByCode('JKR/PLS/2026/100');
    expect(isSuccess(byCodeRes)).toBe(true);
    if (isSuccess(byCodeRes)) {
      expect(byCodeRes.value?.programmeName).toBe('Projek Lebuhraya Perlis');
    }
  });

  it('should handle duplicate code error on create()', async () => {
    const programmeDuplicate: Programme = {
      programmeId: 'p-101',
      programmeCode: 'JKR/PLS/2026/100',
      programmeName: 'Duplicate Code Test',
      status: 'Active',
      isLocked: false,
      createdAt: '2026-08-07T12:00:00.000Z',
      createdBy: 'u1',
    };

    const result = await repo.create(programmeDuplicate);
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.errorCode).toBe('PROGRAMME_ALREADY_EXISTS');
    }
  });

  it('should support update(), archive(), and setCurrentRevision()', async () => {
    const updateRes = await repo.setCurrentRevision('p-100', 'rev-99');
    expect(isSuccess(updateRes)).toBe(true);

    const archiveRes = await repo.archive('p-100', 'u-admin');
    expect(isSuccess(archiveRes)).toBe(true);
    if (isSuccess(archiveRes)) {
      expect(archiveRes.value.status).toBe('Archived');
    }
  });

  it('should execute transaction rollback cleanly via withTransaction()', async () => {
    const txResult = await withTransaction(async (_tx) => {
      await repo.setCurrentRevision('p-100', 'rev-failed');
      throw new Error('Simulated transaction failure');
    });

    expect(isFailure(txResult)).toBe(true);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { ProgrammeRevisionRepository } from '@/repositories/ProgrammeRevisionRepository';
import {
  IDatabaseAdapter,
  IDatabaseAdapterOptions,
} from '@/repositories/adapters/IDatabaseAdapter';
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
    const selectOne = vi.fn(async (table: string, _filter: Record<string, unknown>) =>
      table === 'programme' ? { current_revision_id: 'r1' } : mockRow
    );
    const mockAdapter: IDatabaseAdapter = {
      selectOne: async <T>(table: string, filter: Record<string, unknown>) =>
        Success(await selectOne(table, filter) as unknown as T),
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
    expect(selectOne).toHaveBeenNthCalledWith(1, 'programme', { programme_id: 'p1' });
    expect(selectOne).toHaveBeenNthCalledWith(2, 'programme_revision', {
      programme_id: 'p1',
      revision_id: 'r1',
    });
  });

  it('should map historical revisions against the canonical programme pointer', async () => {
    const currentRow = mapper.toRevisionRow(mockRevision);
    const historicalRow = mapper.toRevisionRow({
      ...mockRevision,
      revisionId: 'r0',
      revisionNumber: 0,
      status: 'Superseded',
      isCurrent: false,
    });
    const selectMany = vi.fn(async (
      _table: string,
      _filter?: Record<string, unknown>,
      _options?: unknown
    ) => [historicalRow, currentRow]);
    const mockAdapter: IDatabaseAdapter = {
      selectOne: async <T>() => Success({ current_revision_id: 'r1' } as unknown as T),
      selectMany: async <T>(
        table: string,
        filter?: Record<string, unknown>,
        options?: IDatabaseAdapterOptions
      ) =>
        Success(await selectMany(table, filter, options) as unknown as T[]),
      insert: async <T>() => Success({} as T),
      update: async <T>() => Success({} as T),
      exists: async () => Success(true),
    };

    const result = await new ProgrammeRevisionRepository(mockAdapter, mapper).findByProgrammeId('p1');

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.map(({ revisionId, isCurrent }) => ({ revisionId, isCurrent }))).toEqual([
        { revisionId: 'r0', isCurrent: false },
        { revisionId: 'r1', isCurrent: true },
      ]);
    }
    expect(selectMany).toHaveBeenCalledWith(
      'programme_revision',
      { programme_id: 'p1' },
      { orderBy: 'revision_no', ascending: true }
    );
  });

  it('should update revision status correctly', async () => {
    const approvedRevision = { ...mockRevision, status: 'Approved' as const };
    const mockRow = mapper.toRevisionRow(approvedRevision);
    const update = vi.fn(async (
      _table: string,
      _filter: Record<string, unknown>,
      _updates: Record<string, unknown>
    ) => mockRow);
    const mockAdapter: IDatabaseAdapter = {
      selectOne: async <T>() => Success({ current_revision_id: 'r1' } as unknown as T),
      selectMany: async <T>() => Success([] as T[]),
      insert: async <T>() => Success({} as T),
      update: async <T>(
        table: string,
        filter: Record<string, unknown>,
        updates: Record<string, unknown>
      ) =>
        Success(await update(table, filter, updates) as unknown as T),
      exists: async () => Success(true),
    };

    const repo = new ProgrammeRevisionRepository(mockAdapter, mapper);
    const result = await repo.updateStatus('r1', 'Approved', 'u1');

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.status).toBe('Approved');
    }
    expect(update).toHaveBeenCalledOnce();
    expect(update.mock.calls[0]?.[2]).not.toHaveProperty('is_current');
    expect(update.mock.calls[0]?.[2]).not.toHaveProperty('updated_at');
  });
});

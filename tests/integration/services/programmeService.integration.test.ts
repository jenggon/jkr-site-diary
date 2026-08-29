import { describe, it, expect } from 'vitest';
import { ProgrammeService } from '@/services/ProgrammeService';
import { ProgrammeRepository } from '@/repositories/ProgrammeRepository';
import { ProgrammeRevisionRepository } from '@/repositories/ProgrammeRevisionRepository';
import { ProgrammeRowMapper } from '@/repositories/mappers/ProgrammeRowMapper';
import { IDatabaseAdapter } from '@/repositories/adapters/IDatabaseAdapter';
import { DatabaseTransactionManager } from '@/transactions/DatabaseTransactionManager';
import { SystemClock } from '@/lib/clock';
import { Logger } from '@/lib/logger';
import { NoopDomainEventPublisher } from '@/events/NoopDomainEventPublisher';
import { isSuccess, Success, Failure } from '@/lib/result';
import { ProgrammeNotFoundError } from '@/errors/programmeErrors';

describe('ProgrammeService Integration Scenarios', () => {
  const mapper = new ProgrammeRowMapper();
  const mockDbState: Map<string, Record<string, unknown>> = new Map();

  const mockAdapter: IDatabaseAdapter = {
    selectOne: async <T>(_table: string, filter: Record<string, unknown>) => {
      for (const item of mockDbState.values()) {
        let match = true;
        for (const [k, v] of Object.entries(filter)) {
          if (item[k] !== v) match = false;
        }
        if (match) return Success(item as T);
      }
      return Success(null);
    },

    selectMany: async <T>(_table: string, filter?: Record<string, unknown>) => {
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

    insert: async <T>(_table: string, row: Record<string, unknown>) => {
      const id = (row.programme_id ?? row.revision_id ?? `id_${Date.now()}`) as string;
      const stored = { ...row, programme_id: id };
      mockDbState.set(id, stored);
      return Success(stored as T);
    },

    update: async <T>(_table: string, filter: Record<string, unknown>, updates: Record<string, unknown>) => {
      const id = (filter.programme_id ?? filter.revision_id) as string;
      const existing = mockDbState.get(id);
      if (!existing) return Failure(new ProgrammeNotFoundError('Not found'));
      const updated = { ...existing, ...updates };
      mockDbState.set(id, updated);
      return Success(updated as T);
    },

    exists: async (_table: string, filter: Record<string, unknown>) => {
      const code = filter.programme_code as string;
      for (const item of mockDbState.values()) {
        if (item.programme_code === code) return Success(true);
      }
      return Success(false);
    },
  };

  const programmeRepo = new ProgrammeRepository(mockAdapter, mapper);
  const revisionRepo = new ProgrammeRevisionRepository(mockAdapter, mapper);
  const txManager = new DatabaseTransactionManager();
  const clock = new SystemClock();
  const logger = { info: () => {}, error: () => {}, warn: () => {}, debug: () => {} } as unknown as Logger;
  const eventPublisher = new NoopDomainEventPublisher();

  const service = new ProgrammeService({
    programmeRepository: programmeRepo,
    revisionRepository: revisionRepo,
    transactionManager: txManager,
    clock,
    logger,
    eventPublisher,
  });

  it('should execute end-to-end createProgramme workflow', async () => {
    const result = await service.createProgramme({
      programmeCode: 'JKR/PLS/2026/999',
      programmeName: 'Projek Integrasi',
      createdBy: 'user-admin',
    });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.programmeCode).toBe('JKR/PLS/2026/999');
      expect(result.value.status).toBe('Active');
    }
  });

  it('should fetch created programme via getProgramme', async () => {
    const listRes = await service.listProgrammes();
    expect(isSuccess(listRes)).toBe(true);
    if (isSuccess(listRes) && listRes.value.length > 0) {
      const prog = listRes.value[0];
      if (prog) {
        const getRes = await service.getProgramme(prog.programmeId);
        expect(isSuccess(getRes)).toBe(true);
      }
    }
  });
});

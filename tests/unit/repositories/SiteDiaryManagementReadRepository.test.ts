import { describe, expect, it, vi } from 'vitest';
import { SiteDiaryManagementReadRepository } from '@/repositories/SiteDiaryManagementReadRepository';

const EXPECTED_REVISION_PROJECTION = 'revision_id, programme_id, revision_no, revision_name, status, programme!programme_revision_programme_id_fkey(current_revision_id)';

describe('SiteDiaryManagementReadRepository', () => {
  it('queries single revision using authoritative revision_name and explicit foreign key qualifier', async () => {
    const query: Record<string, ReturnType<typeof vi.fn>> = {};
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        revision_id: 'rev-1',
        programme_id: 'prog-1',
        revision_no: 1,
        revision_name: 'Original Baseline',
        status: 'Approved',
        programme: { current_revision_id: 'rev-1' },
      },
      error: null,
    });
    const client = { from: vi.fn(() => query) };

    const repo = new SiteDiaryManagementReadRepository(client as never);
    const result = await repo.findRevision('prog-1', 'rev-1');

    expect(client.from).toHaveBeenCalledWith('programme_revision');
    expect(query.select).toHaveBeenCalledWith(EXPECTED_REVISION_PROJECTION);
    expect(query.eq).toHaveBeenNthCalledWith(1, 'programme_id', 'prog-1');
    expect(query.eq).toHaveBeenNthCalledWith(2, 'revision_id', 'rev-1');
    expect(result).toEqual({
      revision_id: 'rev-1',
      programme_id: 'prog-1',
      revision_no: 1,
      revision_name: 'Original Baseline',
      status: 'Approved',
      programme: { current_revision_id: 'rev-1' },
    });
  });

  it('queries all revisions for a programme with explicit foreign key qualifier ordered by revision_no descending', async () => {
    const query: Record<string, ReturnType<typeof vi.fn>> = {};
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.order = vi.fn().mockResolvedValue({
      data: [
        {
          revision_id: 'rev-2',
          programme_id: 'prog-1',
          revision_no: 2,
          revision_name: 'Semakan Semasa',
          status: 'Approved',
          programme: { current_revision_id: 'rev-2' },
        },
        {
          revision_id: 'rev-1',
          programme_id: 'prog-1',
          revision_no: 1,
          revision_name: 'Semakan Asal',
          status: 'Approved',
          programme: { current_revision_id: 'rev-2' },
        },
      ],
      error: null,
    });
    const client = { from: vi.fn(() => query) };

    const repo = new SiteDiaryManagementReadRepository(client as never);
    const results = await repo.findRevisions('prog-1');

    expect(client.from).toHaveBeenCalledWith('programme_revision');
    expect(query.select).toHaveBeenCalledWith(EXPECTED_REVISION_PROJECTION);
    expect(query.eq).toHaveBeenCalledWith('programme_id', 'prog-1');
    expect(query.order).toHaveBeenCalledWith('revision_no', { ascending: false });
    expect(results).toHaveLength(2);
    expect(results[0]?.revision_name).toBe('Semakan Semasa');
    expect(results[1]?.revision_name).toBe('Semakan Asal');
  });

  it('fails closed when findRevision database query encounters an error', async () => {
    const query: Record<string, ReturnType<typeof vi.fn>> = {};
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Database read failed' },
    });
    const client = { from: vi.fn(() => query) };

    const repo = new SiteDiaryManagementReadRepository(client as never);
    await expect(repo.findRevision('prog-1', 'rev-1')).rejects.toThrow(
      'Failed to resolve Programme Revision: Database read failed'
    );
  });

  it('fails closed when findRevisions database query encounters an error', async () => {
    const query: Record<string, ReturnType<typeof vi.fn>> = {};
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.order = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Network connection reset' },
    });
    const client = { from: vi.fn(() => query) };

    const repo = new SiteDiaryManagementReadRepository(client as never);
    await expect(repo.findRevisions('prog-1')).rejects.toThrow(
      'Failed to retrieve Programme Revisions: Network connection reset'
    );
  });

  it('applies deterministic date-descending then diary-identity-ascending ordering', async () => {
    const query: Record<string, ReturnType<typeof vi.fn>> = {};
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.order = vi.fn()
      .mockImplementationOnce(() => query)
      .mockResolvedValueOnce({ data: [], error: null });
    const client = { from: vi.fn(() => query) };
    await new SiteDiaryManagementReadRepository(client as never).findDiaries('programme', 'revision');
    expect(query.eq).toHaveBeenNthCalledWith(1, 'programme_id', 'programme');
    expect(query.eq).toHaveBeenNthCalledWith(2, 'revision_id', 'revision');
    expect(query.order).toHaveBeenNthCalledWith(1, 'activity_date', { ascending: false });
    expect(query.order).toHaveBeenNthCalledWith(2, 'site_diary_id', { ascending: true });
  });

  it('fails closed when findDiaries database query encounters an error', async () => {
    const query: Record<string, ReturnType<typeof vi.fn>> = {};
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.order = vi.fn()
      .mockImplementationOnce(() => query)
      .mockResolvedValueOnce({ data: null, error: { message: 'Permission denied' } });
    const client = { from: vi.fn(() => query) };

    const repo = new SiteDiaryManagementReadRepository(client as never);
    await expect(repo.findDiaries('prog-1', 'rev-1')).rejects.toThrow(
      'Failed to retrieve Site Diary management projection: Permission denied'
    );
  });
});

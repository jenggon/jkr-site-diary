import { describe, expect, it, vi } from 'vitest';
import { SiteDiaryManagementReadRepository } from '@/repositories/SiteDiaryManagementReadRepository';
import { SiteDiaryManagementReadService } from '@/services/SiteDiaryManagementReadService';

describe('Records Read Repository Contract (F4.5-B01A.2)', () => {
  const programmeId = '11111111-1111-4111-8111-111111111111';
  const currentRevId = '33333333-3333-4333-8333-333333333333';
  const historicalRevId = '77777777-7777-4777-8777-777777777777';

  it('proves findRevision and findRevisions use authoritative revision_name and explicit FK qualification', async () => {
    const selectMock = vi.fn();
    const query: Record<string, unknown> = {
      select: selectMock.mockImplementation(() => query),
      eq: vi.fn(() => query),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            revision_id: currentRevId,
            programme_id: programmeId,
            revision_no: 2,
            revision_name: 'Semakan Semasa',
            status: 'Approved',
            programme: { current_revision_id: currentRevId },
          },
          {
            revision_id: historicalRevId,
            programme_id: programmeId,
            revision_no: 1,
            revision_name: 'Semakan Asal',
            status: 'Approved',
            programme: { current_revision_id: currentRevId },
          },
        ],
        error: null,
      }),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          revision_id: currentRevId,
          programme_id: programmeId,
          revision_no: 2,
          revision_name: 'Semakan Semasa',
          status: 'Approved',
          programme: { current_revision_id: currentRevId },
        },
        error: null,
      }),
    };

    const client = {
      from: vi.fn((table: string) => {
        expect(table).toBe('programme_revision');
        return query;
      }),
    };

    const repo = new SiteDiaryManagementReadRepository(client as never);

    // 1. Single revision query verification
    const single = await repo.findRevision(programmeId, currentRevId);
    expect(single?.revision_name).toBe('Semakan Semasa');
    expect(selectMock).toHaveBeenCalledWith(
      'revision_id, programme_id, revision_no, revision_name, status, programme!programme_revision_programme_id_fkey(current_revision_id)'
    );

    // 2. Multi revision query verification
    const all = await repo.findRevisions(programmeId);
    expect(all).toHaveLength(2);
    expect(all[0]?.revision_name).toBe('Semakan Semasa');
    expect(all[1]?.revision_name).toBe('Semakan Asal');
  });

  it('proves exactly one current revision is resolved and historical revisions remain distinguishable', async () => {
    const mockRevisions = [
      {
        revision_id: currentRevId,
        programme_id: programmeId,
        revision_no: 2,
        revision_name: 'Semakan Semasa',
        status: 'Approved' as const,
        programme: { current_revision_id: currentRevId },
      },
      {
        revision_id: historicalRevId,
        programme_id: programmeId,
        revision_no: 1,
        revision_name: 'Semakan Asal',
        status: 'Approved' as const,
        programme: { current_revision_id: currentRevId },
      },
    ];

    const repo = {
      findRevisions: vi.fn().mockResolvedValue(mockRevisions),
      findRevision: vi.fn(),
      findDiaries: vi.fn(),
    } as unknown as SiteDiaryManagementReadRepository;

    const service = new SiteDiaryManagementReadService(repo);
    const result = await service.listRevisions(programmeId);

    expect(result).toHaveLength(2);

    // Exactly one current revision
    const current = result.filter((r) => r.isCurrentRevision);
    expect(current).toHaveLength(1);
    expect(current[0]).toEqual({
      programmeId,
      revisionId: currentRevId,
      revisionNumber: 2,
      revisionTitle: 'Semakan Semasa',
      revisionStatus: 'Approved',
      isCurrentRevision: true,
      isReadOnly: false,
    });

    // Historical revision distinguished
    const historical = result.find((r) => r.revisionId === historicalRevId);
    expect(historical).toEqual({
      programmeId,
      revisionId: historicalRevId,
      revisionNumber: 1,
      revisionTitle: 'Semakan Asal',
      revisionStatus: 'Approved',
      isCurrentRevision: false,
      isReadOnly: true,
    });
  });

  it('proves fail-closed behavior on database error for both read methods', async () => {
    const errorClient = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database connection failed' } }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'PGRST201 embedding error' } }),
      })),
    };

    const repo = new SiteDiaryManagementReadRepository(errorClient as never);

    await expect(repo.findRevision(programmeId, currentRevId)).rejects.toThrow(
      'Failed to resolve Programme Revision: PGRST201 embedding error'
    );
    await expect(repo.findRevisions(programmeId)).rejects.toThrow(
      'Failed to retrieve Programme Revisions: Database connection failed'
    );
  });
});

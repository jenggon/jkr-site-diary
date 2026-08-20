import { describe, expect, it, vi } from 'vitest';
import {
  mapRawRowToPrintDto,
  RawPrintDiaryRow,
  SiteDiaryPrintReadRepository,
  SiteDiaryPrintReadError,
} from '@/repositories/SiteDiaryPrintReadRepository';
import { ActivityStatus, ActivityWeather } from '@/types/activity';

describe('SiteDiaryPrintReadRepository', () => {
  const diaryAId = '00000000-0000-4000-8000-000000000001';
  const programmeId = '11111111-1111-4000-8000-111111111111';
  const currentRevisionId = '22222222-2222-4000-8000-222222222222';
  const supersededRevisionId = '33333333-3333-4000-8000-333333333333';
  const actorId = 'actor-uuid-1';

  const mockRawRow: RawPrintDiaryRow = {
    site_diary_id: diaryAId,
    programme_id: programmeId,
    revision_id: currentRevisionId,
    activity_id: 'act-1',
    activity_date: '2026-08-20',
    weather: ActivityWeather.Morning,
    notes: 'Poured concrete for foundation slab.',
    status: ActivityStatus.InProgress,
    manpower: [
      { trade_name: 'Carpenter', bumi_count: 2, non_bumi_count: 1, foreign_count: 3 },
      { trade_name: 'Bar Bender', bumi_count: 1, non_bumi_count: 0, foreign_count: 4 },
    ],
    print_context: {
      location: 'Section A Grid 1-4',
      work_start_time: '08:00',
      work_end_time: '17:00',
      weather_condition: 'ELOK',
      rain_start_time: null,
      rain_end_time: null,
      contractor_scope: 'CONTRACTOR',
    },
    submitted_by: actorId,
    submitted_at: '2026-08-20T08:00:00.000Z',
    updated_at: null,
    activity: {
      activity_id: 'act-1',
      source_type: 'MSP',
      task_id: 'task-1',
      vo_item_id: null,
      subtask: 'Ground Beam Concreting',
      subtask_display_name: 'Ground Beam Concreting (B1)',
      status: ActivityStatus.InProgress,
      actual_start_date: '2026-08-19',
      completed_date: null,
      task: {
        task_id: 'task-1',
        task_name: 'Substructure Concreting',
        task_uid: 105,
        wbs: '1.2.1',
        outline_number: '1.2.1',
        is_critical: true,
      },
      vo_item: null,
    },
    programme: {
      programme_id: programmeId,
      programme_code: 'JKR-KUL-2026-01',
      programme_name: 'Hospital Extension Project',
      current_revision_id: currentRevisionId,
      created_by: actorId,
    },
    programme_revision: {
      revision_id: currentRevisionId,
      revision_no: 2,
      revision_title: 'Rev 2 Approved Baseline',
      status: 'Approved',
    },
  };

  it('queries exact site_diary_id using RPC f25_get_site_diary_print_read', async () => {
    const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
    queryBuilder.maybeSingle = vi.fn().mockResolvedValue({ data: mockRawRow, error: null });

    const client = {
      rpc: vi.fn((rpcName: string, _args: unknown) => {
        if (rpcName === 'f25_get_site_diary_print_read') return queryBuilder;
        throw new Error(`Unexpected rpc ${rpcName}`);
      }),
    };

    const repository = new SiteDiaryPrintReadRepository(client as never);
    const result = await repository.getExact(diaryAId, actorId);

    expect(client.rpc).toHaveBeenCalledWith('f25_get_site_diary_print_read', { p_site_diary_id: diaryAId });
    expect(result.siteDiaryId).toBe(diaryAId);
    expect(result.activityId).toBe('act-1');
    expect(result.programmeId).toBe(programmeId);
    expect(result.revisionId).toBe(currentRevisionId);
    expect(result.isCurrentRevision).toBe(true);
    expect(result.isHistorical).toBe(false);
    expect(result.wbs).toBe('1.2.1');
    expect(result.taskName).toBe('Substructure Concreting');
    expect(result.isCritical).toBe(true);
    expect(result.manpower).toHaveLength(2);
  });

  it('maps VO activity projection accurately', () => {
    const voRow: RawPrintDiaryRow = {
      ...mockRawRow,
      activity: {
        activity_id: 'act-vo-1',
        source_type: 'VO',
        task_id: null,
        vo_item_id: 'vo-item-1',
        subtask: 'Additional Pile Cap',
        subtask_display_name: 'Additional Pile Cap PC-4',
        status: ActivityStatus.InProgress,
        actual_start_date: '2026-08-20',
        completed_date: null,
        task: null,
        vo_item: {
          vo_item_id: 'vo-item-1',
          vo_reference: 'VO-01',
          line_item: 'Item 4.1',
          description: 'Construct additional pile cap due to ground variation',
        },
      },
    };

    const dto = mapRawRowToPrintDto(voRow);
    expect(dto.sourceType).toBe('VO');
    expect(dto.wbs).toBe('VO-01');
    expect(dto.taskName).toBe('Additional Pile Cap PC-4');
    expect(dto.isCritical).toBe(false);
  });

  it('reads historical superseded revision diaries without reinterpretation', async () => {
    const historicalRow: RawPrintDiaryRow = {
      ...mockRawRow,
      revision_id: supersededRevisionId,
      programme_revision: {
        revision_id: supersededRevisionId,
        revision_no: 1,
        revision_title: 'Rev 1 Original Baseline',
        status: 'Superseded',
      },
    };

    const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
    queryBuilder.maybeSingle = vi.fn().mockResolvedValue({ data: historicalRow, error: null });

    const client = {
      rpc: vi.fn(() => queryBuilder),
    };

    const repository = new SiteDiaryPrintReadRepository(client as never);
    const result = await repository.getExact(diaryAId, actorId);

    expect(result.revisionId).toBe(supersededRevisionId);
    expect(result.revisionNumber).toBe(1);
    expect(result.revisionStatus).toBe('Superseded');
    expect(result.isCurrentRevision).toBe(false);
    expect(result.isHistorical).toBe(true);
  });

  it('throws error for null print_context (fail closed)', () => {
    const legacyRow: RawPrintDiaryRow = {
      ...mockRawRow,
      print_context: null,
      manpower: null,
    };

    expect(() => mapRawRowToPrintDto(legacyRow)).toThrowError(SiteDiaryPrintReadError);
    expect(() => mapRawRowToPrintDto(legacyRow)).toThrowError('Malformed print_context in database record');
  });
  
  it('throws error for invalid contractor_scope (fail closed)', () => {
    const legacyRow: RawPrintDiaryRow = {
      ...mockRawRow,
      print_context: {
         ...mockRawRow.print_context!,
         contractor_scope: 'INVALID_SCOPE' as never,
      },
    };

    expect(() => mapRawRowToPrintDto(legacyRow)).toThrowError(SiteDiaryPrintReadError);
    expect(() => mapRawRowToPrintDto(legacyRow)).toThrowError('Invalid contractor_scope: INVALID_SCOPE');
  });

  it('throws 404 when site diary record does not exist', async () => {
    const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
    queryBuilder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

    const client = { rpc: vi.fn(() => queryBuilder) };
    const repository = new SiteDiaryPrintReadRepository(client as never);

    await expect(repository.getExact('non-existent-id', actorId)).rejects.toMatchObject({
      status: 404,
      message: 'Site diary record not found',
    });
  });

  it('throws 403 on RPC P0001 CANONICAL_CONTEXT_MISMATCH error', async () => {
    const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
    queryBuilder.maybeSingle = vi.fn().mockResolvedValue({ 
      data: null, 
      error: { code: 'P0001', message: 'CANONICAL_CONTEXT_MISMATCH' } 
    });

    const client = { rpc: vi.fn(() => queryBuilder) };
    const repository = new SiteDiaryPrintReadRepository(client as never);

    await expect(repository.getExact(diaryAId, actorId)).rejects.toMatchObject({
      status: 403,
      message: 'Forbidden: Not authorized for programme or context mismatch',
    });
  });
});

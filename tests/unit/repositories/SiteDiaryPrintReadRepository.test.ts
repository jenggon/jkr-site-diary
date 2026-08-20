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
      revision_name: 'Rev 2 Approved Baseline',
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
    const voRow = {
      ...mockRawRow,
      activity_id: 'act-vo-1',
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
    } as unknown as RawPrintDiaryRow;

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
        revision_name: 'Rev 1 Original Baseline',
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

  it('throws 500 on RPC P0001 CANONICAL_CONTEXT_MISMATCH error', async () => {
    const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
    queryBuilder.maybeSingle = vi.fn().mockResolvedValue({ 
      data: null, 
      error: { code: 'P0001', message: 'CANONICAL_CONTEXT_MISMATCH' } 
    });

    const client = { rpc: vi.fn(() => queryBuilder) };
    const repository = new SiteDiaryPrintReadRepository(client as never);

    await expect(repository.getExact(diaryAId, actorId)).rejects.toMatchObject({
      status: 500,
      message: 'Internal Server Error: Canonical Context Mismatch',
    });
  });
});

describe('mapRawRowToPrintDto Fail Closed Behavior', () => {
  const baseRawRow: RawPrintDiaryRow = {
    site_diary_id: 'diary-1',
    programme_id: 'prog-1',
    revision_id: 'rev-1',
    activity_id: 'act-1',
    activity_date: '2026-08-20',
    weather: ActivityWeather.Morning,
    notes: '',
    status: ActivityStatus.InProgress,
    manpower: [],
    print_context: {
      location: 'Section A',
      work_start_time: '08:00',
      work_end_time: '17:00',
      weather_condition: 'ELOK',
      rain_start_time: null,
      rain_end_time: null,
      contractor_scope: 'CONTRACTOR',
    },
    submitted_by: 'actor-1',
    submitted_at: '2026-08-20T08:00:00.000Z',
    updated_at: null,
    activity: {
      activity_id: 'act-1',
      source_type: 'MSP',
      task_id: 'task-1',
      vo_item_id: null,
      subtask: 'Subtask 1',
      subtask_display_name: 'Subtask 1 Display',
      status: ActivityStatus.InProgress,
      actual_start_date: '2026-08-19',
      completed_date: null,
      task: {
        task_id: 'task-1',
        task_name: 'Task 1',
        task_uid: 1,
        wbs: '1.1',
        outline_number: '1.1',
        is_critical: false,
      },
      vo_item: null,
    },
    programme: {
      programme_id: 'prog-1',
      programme_code: 'P1',
      programme_name: 'Programme 1',
      current_revision_id: 'rev-1',
      created_by: 'actor-1',
    },
    programme_revision: {
      revision_id: 'rev-1',
      revision_no: 1,
      revision_name: 'Rev 1',
      status: 'Approved',
    },
  };

  const cases = [
    {
      name: 'missing Programme',
      mod: { programme: null },
      err: 'Canonical context missing: programme',
    },
    {
      name: 'Programme ID mismatch',
      mod: { programme: { ...baseRawRow.programme!, programme_id: 'wrong-prog' } },
      err: 'Canonical context mismatch: programme_id',
    },
    {
      name: 'missing Revision',
      mod: { programme_revision: null },
      err: 'Canonical context missing: revision',
    },
    {
      name: 'Revision ID mismatch',
      mod: { programme_revision: { ...baseRawRow.programme_revision!, revision_id: 'wrong-rev' } },
      err: 'Canonical context mismatch: revision_id',
    },
    {
      name: 'missing Activity',
      mod: { activity: null },
      err: 'Canonical context missing: activity',
    },
    {
      name: 'invalid source_type',
      mod: { activity: { ...baseRawRow.activity!, source_type: 'INVALID' as never } },
      err: 'Canonical context invalid: activity source_type',
    },
    {
      name: 'MSP without Task',
      mod: { activity: { ...baseRawRow.activity!, source_type: 'MSP', task: null } },
      err: 'Canonical context missing: task',
    },
    {
      name: 'VO without VO Item',
      mod: { activity: { ...baseRawRow.activity!, source_type: 'VO', vo_item: null } },
      err: 'Canonical context missing: vo_item',
    },
    {
      name: 'malformed print_context',
      mod: { print_context: null },
      err: 'Malformed print_context in database record',
    },
    {
      name: 'explicit invalid contractor_scope',
      mod: { print_context: { ...baseRawRow.print_context!, contractor_scope: 'INVALID' } },
      err: 'Invalid contractor_scope: INVALID',
    },
    {
      name: 'explicit malformed location',
      mod: { print_context: { ...baseRawRow.print_context!, location: 123 } },
      err: 'Malformed print_context: location must be string',
    },
    {
      name: 'explicit invalid weather',
      mod: { print_context: { ...baseRawRow.print_context!, weather_condition: 'SUNNY' } },
      err: 'Malformed print_context: weather_condition has invalid format',
    },
    {
      name: 'explicit malformed work time',
      mod: { print_context: { ...baseRawRow.print_context!, work_start_time: '99:99' } },
      err: 'Malformed print_context: work_start_time has invalid format',
    },
    {
      name: 'explicit malformed rain time',
      mod: { print_context: { ...baseRawRow.print_context!, rain_end_time: 'not-a-time' } },
      err: 'Malformed print_context: rain_end_time has invalid format',
    },
    {
      name: 'malformed non-array manpower',
      mod: { manpower: 'not-an-array' },
      err: 'Canonical context malformed: manpower is not an array',
    },
    {
      name: 'malformed manpower entry (missing trade_name)',
      mod: { manpower: [{ trade_name: '', bumi_count: 0, non_bumi_count: 0, foreign_count: 0 }] },
      err: 'Canonical context malformed: manpower trade_name missing',
    },
    {
      name: 'malformed manpower count',
      mod: { manpower: [{ trade_name: 'Trade', bumi_count: null, non_bumi_count: 0, foreign_count: 0 }] },
      err: 'Canonical context malformed: manpower count missing or invalid',
    },
    {
      name: 'MSP missing usable identity',
      mod: { 
        activity: { 
          ...baseRawRow.activity!, 
          subtask: '', 
          subtask_display_name: '',
          task: { ...baseRawRow.activity!.task!, task_name: '' } 
        } 
      },
      err: 'Canonical context missing: MSP task has no usable identity',
    },
    {
      name: 'VO missing usable identity',
      mod: { 
        activity: { 
          ...baseRawRow.activity!, 
          source_type: 'VO',
          subtask: '', 
          subtask_display_name: '',
          vo_item: { 
            vo_item_id: 'v-1', 
            vo_reference: '', 
            line_item: '', 
            description: '' 
          } 
        } 
      },
      err: 'Canonical context missing: VO has no usable identity',
    },
  ];

  cases.forEach(({ name, mod, err }) => {
    it(`fails closed on ${name}`, () => {
      const row = { ...baseRawRow, ...mod } as unknown as RawPrintDiaryRow;
      expect(() => mapRawRowToPrintDto(row)).toThrow(err);
    });
  });

  it('maps valid MSP successfully', () => {
    const dto = mapRawRowToPrintDto(baseRawRow);
    expect(dto.sourceType).toBe('MSP');
    expect(dto.wbs).toBe('1.1');
    expect(dto.revisionTitle).toBe('Rev 1');
  });

  it('maps valid VO successfully', () => {
    const row = {
      ...baseRawRow,
      activity: {
        ...baseRawRow.activity!,
        source_type: 'VO',
        task: null,
        vo_item: {
          vo_item_id: 'vo-1',
          vo_reference: 'VO-1',
          line_item: 'Line 1',
          description: 'Desc',
        },
      },
    } as unknown as RawPrintDiaryRow;
    const dto = mapRawRowToPrintDto(row);
    expect(dto.sourceType).toBe('VO');
    expect(dto.wbs).toBe('VO-1');
  });

  it('maps valid historical record successfully', () => {
    const row = {
      ...baseRawRow,
      programme: {
        ...baseRawRow.programme!,
        current_revision_id: 'rev-2',
      },
    } as unknown as RawPrintDiaryRow;
    const dto = mapRawRowToPrintDto(row);
    expect(dto.isHistorical).toBe(true);
    expect(dto.isCurrentRevision).toBe(false);
  });

  it('canonical print_context {} succeeds and uses established CONTRACTOR default', () => {
    const row = {
      ...baseRawRow,
      print_context: {},
    } as unknown as RawPrintDiaryRow;
    const dto = mapRawRowToPrintDto(row);
    expect(dto.printContext.contractorScope).toBe('CONTRACTOR');
    expect(dto.printContext.location).toBe('');
    expect(dto.printContext.workStartTime).toBeNull();
  });

  it('missing contractor_scope uses established CONTRACTOR default', () => {
    const row = {
      ...baseRawRow,
      print_context: { location: 'L1' },
    } as unknown as RawPrintDiaryRow;
    const dto = mapRawRowToPrintDto(row);
    expect(dto.printContext.contractorScope).toBe('CONTRACTOR');
  });

  it('null/absent canonical manpower maps to valid empty manpower', () => {
    const row = {
      ...baseRawRow,
      manpower: null,
    } as unknown as RawPrintDiaryRow;
    const dto = mapRawRowToPrintDto(row);
    expect(dto.manpower).toEqual([]);
    
    const row2 = {
      ...baseRawRow,
      manpower: undefined,
    } as unknown as RawPrintDiaryRow;
    const dto2 = mapRawRowToPrintDto(row2);
    expect(dto2.manpower).toEqual([]);
  });
});

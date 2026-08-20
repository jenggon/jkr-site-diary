import { describe, expect, it, vi } from 'vitest';
import {
  mapRawRowToPrintDto,
  PRINT_DIARY_PROJECTION,
  RawPrintDiaryRow,
  SiteDiaryPrintReadRepository,
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
    approval: [
      {
        approval_id: 'app-1',
        approval_status: 'Approved',
        approval_date: '2026-08-20T10:00:00.000Z',
        approved_by: 'approver-1',
        approval_comment: 'Verified on site',
      },
    ],
  };

  it('queries exact site_diary_id using canonical PRINT_DIARY_PROJECTION', async () => {
    const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
    queryBuilder.select = vi.fn(() => queryBuilder);
    queryBuilder.eq = vi.fn(() => queryBuilder);
    queryBuilder.maybeSingle = vi.fn().mockResolvedValue({ data: mockRawRow, error: null });

    const client = {
      from: vi.fn((table: string) => {
        if (table === 'site_diary') return queryBuilder;
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const repository = new SiteDiaryPrintReadRepository(client as never);
    const result = await repository.getExact(diaryAId, actorId);

    expect(client.from).toHaveBeenCalledWith('site_diary');
    expect(queryBuilder.select).toHaveBeenCalledWith(PRINT_DIARY_PROJECTION);
    expect(queryBuilder.eq).toHaveBeenCalledWith('site_diary_id', diaryAId);
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
    expect(result.approval?.approvalStatus).toBe('Approved');
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
    queryBuilder.select = vi.fn(() => queryBuilder);
    queryBuilder.eq = vi.fn(() => queryBuilder);
    queryBuilder.maybeSingle = vi.fn().mockResolvedValue({ data: historicalRow, error: null });

    const client = {
      from: vi.fn(() => queryBuilder),
    };

    const repository = new SiteDiaryPrintReadRepository(client as never);
    const result = await repository.getExact(diaryAId, actorId);

    expect(result.revisionId).toBe(supersededRevisionId);
    expect(result.revisionNumber).toBe(1);
    expect(result.revisionStatus).toBe('Superseded');
    expect(result.isCurrentRevision).toBe(false);
    expect(result.isHistorical).toBe(true);
  });

  it('handles null / legacy print_context with safe contract defaults', () => {
    const legacyRow: RawPrintDiaryRow = {
      ...mockRawRow,
      print_context: null,
      manpower: null,
    };

    const dto = mapRawRowToPrintDto(legacyRow);
    expect(dto.printContext).toEqual({
      location: '',
      workStartTime: null,
      workEndTime: null,
      weatherCondition: null,
      rainStartTime: null,
      rainEndTime: null,
      contractorScope: 'CONTRACTOR',
    });
    expect(dto.manpower).toEqual([]);
  });

  it('throws 404 when site diary record does not exist', async () => {
    const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
    queryBuilder.select = vi.fn(() => queryBuilder);
    queryBuilder.eq = vi.fn(() => queryBuilder);
    queryBuilder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

    const client = { from: vi.fn(() => queryBuilder) };
    const repository = new SiteDiaryPrintReadRepository(client as never);

    await expect(repository.getExact('non-existent-id', actorId)).rejects.toMatchObject({
      status: 404,
      message: 'Site diary record not found',
    });
  });

  it('throws 403 when non-creator actor has no active programme membership', async () => {
    const rowOtherCreator: RawPrintDiaryRow = {
      ...mockRawRow,
      programme: {
        ...mockRawRow.programme!,
        created_by: 'different-creator',
      },
    };

    const diaryQuery: Record<string, ReturnType<typeof vi.fn>> = {};
    diaryQuery.select = vi.fn(() => diaryQuery);
    diaryQuery.eq = vi.fn(() => diaryQuery);
    diaryQuery.maybeSingle = vi.fn().mockResolvedValue({ data: rowOtherCreator, error: null });

    const membershipQuery: Record<string, ReturnType<typeof vi.fn>> = {};
    membershipQuery.select = vi.fn(() => membershipQuery);
    membershipQuery.eq = vi.fn(() => membershipQuery);
    membershipQuery.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

    const client = {
      from: vi.fn((table: string) => {
        if (table === 'site_diary') return diaryQuery;
        if (table === 'programme_membership') return membershipQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const repository = new SiteDiaryPrintReadRepository(client as never);

    await expect(repository.getExact(diaryAId, 'unauthorized-user')).rejects.toMatchObject({
      status: 403,
      message: 'Forbidden: Not authorized for programme',
    });
  });

  it('authorizes non-creator actor who holds active programme membership', async () => {
    const rowOtherCreator: RawPrintDiaryRow = {
      ...mockRawRow,
      programme: {
        ...mockRawRow.programme!,
        created_by: 'different-creator',
      },
    };

    const diaryQuery: Record<string, ReturnType<typeof vi.fn>> = {};
    diaryQuery.select = vi.fn(() => diaryQuery);
    diaryQuery.eq = vi.fn(() => diaryQuery);
    diaryQuery.maybeSingle = vi.fn().mockResolvedValue({ data: rowOtherCreator, error: null });

    const membershipQuery: Record<string, ReturnType<typeof vi.fn>> = {};
    membershipQuery.select = vi.fn(() => membershipQuery);
    membershipQuery.eq = vi.fn(() => membershipQuery);
    membershipQuery.maybeSingle = vi.fn().mockResolvedValue({
      data: { membership_id: 'mem-1' },
      error: null,
    });

    const client = {
      from: vi.fn((table: string) => {
        if (table === 'site_diary') return diaryQuery;
        if (table === 'programme_membership') return membershipQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const repository = new SiteDiaryPrintReadRepository(client as never);
    const result = await repository.getExact(diaryAId, 'authorized-member');
    expect(result.siteDiaryId).toBe(diaryAId);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProgramKerjaBoundaryService } from '@/services/ProgramKerjaBoundaryService';
import { IProgrammeRevisionRepository } from '@/repositories/IProgrammeRevisionRepository';
import { IMspResourceRepository } from '@/repositories/IMspResourceRepository';
import { IMspWorkforceRepository } from '@/repositories/IMspWorkforceRepository';
import { IMspMaterialRepository } from '@/repositories/IMspMaterialRepository';
import { ProgrammeRevision } from '@/types/programmeRevision';
import { SystemClock } from '@/lib/clock';
import { logger } from '@/lib/logger';
import { isSuccess, isFailure, Success } from '@/lib/result';

describe('ProgramKerjaBoundaryService', () => {
  let mockRevisionRepo: Partial<IProgrammeRevisionRepository>;
  let mockMspResourceRepo: Partial<IMspResourceRepository>;
  let mockMspWorkforceRepo: Partial<IMspWorkforceRepository>;
  let mockMspMaterialRepo: Partial<IMspMaterialRepository>;
  let service: ProgramKerjaBoundaryService;

  const mockApprovedRevision: ProgrammeRevision = {
    revisionId: 'rev-approved-1',
    programmeId: 'prog-1',
    revisionNumber: 1,
    revisionTitle: 'Rev 1 Approved',
    isCurrent: true,
    status: 'Approved',
    createdAt: '2026-08-01T00:00:00Z',
    createdBy: 'user-1',
  };

  const mockDraftRevision: ProgrammeRevision = {
    revisionId: 'rev-draft-1',
    programmeId: 'prog-1',
    revisionNumber: 2,
    revisionTitle: 'Rev 2 Draft',
    isCurrent: false,
    status: 'Draft',
    createdAt: '2026-08-02T00:00:00Z',
    createdBy: 'user-1',
  };

  const mockArchivedRevision: ProgrammeRevision = {
    revisionId: 'rev-archived-1',
    programmeId: 'prog-1',
    revisionNumber: 0,
    revisionTitle: 'Rev 0 Archived',
    isCurrent: false,
    status: 'Archived',
    createdAt: '2026-07-01T00:00:00Z',
    createdBy: 'user-1',
  };

  beforeEach(() => {
    mockRevisionRepo = {
      findById: vi.fn().mockImplementation(async (id: string) => {
        if (id === 'rev-approved-1') return Success(mockApprovedRevision);
        if (id === 'rev-draft-1') return Success(mockDraftRevision);
        if (id === 'rev-archived-1') return Success(mockArchivedRevision);
        if (id === 'rev-wrong-prog') {
          return Success({ ...mockApprovedRevision, revisionId: 'rev-wrong-prog', programmeId: 'prog-other' });
        }
        return Success(null);
      }),
    };

    mockMspResourceRepo = {
      findResourceTradeByMspTask: vi.fn().mockResolvedValue({
        resourceId: 'res-1',
        tradeCode: 'T-CARP',
        tradeName: 'Carpentry',
        tradeCategory: 'Civil',
      }),
    };

    mockMspWorkforceRepo = {
      findWorkforceByMspTask: vi.fn().mockResolvedValue([
        {
          roleCode: 'SUPERVISOR',
          tradeId: 't-1',
          tradeCode: 'T-CARP',
          tradeName: 'Carpentry',
          allocatedCount: 2,
          skillLevel: 'SKILLED',
          isMandatory: true,
        },
      ]),
    };

    mockMspMaterialRepo = {
      findMaterialsByMspTask: vi.fn().mockResolvedValue([
        {
          materialCode: 'M-CEM',
          materialName: 'Cement',
          materialRole: 'MAIN',
          recommendedQuantity: 50,
          unitOfMeasure: 'BAG',
          isMandatory: true,
          estimatedWastePercentage: 5,
          estimatedCost: 1000,
          estimatedLeadTime: 2,
        },
      ]),
    };

    service = new ProgramKerjaBoundaryService({
      programmeRevisionRepository: mockRevisionRepo as IProgrammeRevisionRepository,
      mspResourceRepository: mockMspResourceRepo as IMspResourceRepository,
      mspWorkforceRepository: mockMspWorkforceRepo as IMspWorkforceRepository,
      mspMaterialRepository: mockMspMaterialRepo as IMspMaterialRepository,
      clock: new SystemClock(),
      logger,
    });
  });

  it('1. Approved revision returns scheduling-derived trade data', async () => {
    const res = await service.getProgramKerjaTrade('prog-1', 'rev-approved-1', 'task-100');
    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res)) {
      expect(res.value).not.toBeNull();
      expect(res.value?.tradeCode).toBe('T-CARP');
    }
  });

  it('2. Draft revision is rejected (returns null)', async () => {
    const res = await service.getProgramKerjaTrade('prog-1', 'rev-draft-1', 'task-100');
    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res)) {
      expect(res.value).toBeNull();
    }
    expect(mockMspResourceRepo.findResourceTradeByMspTask).not.toHaveBeenCalled();
  });

  it('3. Archived revision is rejected (returns null)', async () => {
    const res = await service.getProgramKerjaTrade('prog-1', 'rev-archived-1', 'task-100');
    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res)) {
      expect(res.value).toBeNull();
    }
    expect(mockMspResourceRepo.findResourceTradeByMspTask).not.toHaveBeenCalled();
  });

  it('4. Wrong revisionId for programme is rejected', async () => {
    const res = await service.getProgramKerjaTrade('prog-1', 'rev-wrong-prog', 'task-100');
    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res)) {
      expect(res.value).toBeNull();
    }
    expect(mockMspResourceRepo.findResourceTradeByMspTask).not.toHaveBeenCalled();
  });

  it('5. Non-existent revisionId is rejected', async () => {
    const res = await service.getProgramKerjaTrade('prog-1', 'rev-nonexistent', 'task-100');
    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res)) {
      expect(res.value).toBeNull();
    }
  });

  it('6. Missing revisionId cannot reach raw MSP lookup', async () => {
    const res = await service.getProgramKerjaTrade('prog-1', '', 'task-100');
    expect(isFailure(res)).toBe(true);
    expect(mockMspResourceRepo.findResourceTradeByMspTask).not.toHaveBeenCalled();
  });

  it('7. Approved workforce query uses boundary and returns workforce DTOs', async () => {
    const res = await service.getProgramKerjaWorkforce('prog-1', 'rev-approved-1', 'task-100');
    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res) && res.value) {
      expect(res.value).toHaveLength(1);
      expect(res.value[0]?.roleCode).toBe('SUPERVISOR');
    }
  });

  it('8. Approved materials query uses boundary and returns material DTOs', async () => {
    const res = await service.getProgramKerjaMaterials('prog-1', 'rev-approved-1', 'task-100');
    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res) && res.value) {
      expect(res.value).toHaveLength(1);
      expect(res.value[0]?.materialCode).toBe('M-CEM');
    }
  });
});

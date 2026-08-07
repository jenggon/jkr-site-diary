import { Programme, ProgrammeRevision } from '@/types/programme';
import { ProgrammeRepository } from '@/repositories/ProgrammeRepository';
import { isSuccess } from '@/lib/result';

const repo = new ProgrammeRepository();

/**
 * Programme Engine Business Service (Prototype)
 */
export async function createProgramme(
  data: Programme
): Promise<Programme> {
  const result = await repo.create(data);
  if (isSuccess(result)) {
    return result.value;
  }
  throw result.error;
}

export async function getProgrammeById(programmeId: string): Promise<Programme | null> {
  const result = await repo.findById(programmeId);
  if (isSuccess(result)) {
    return result.value;
  }
  throw result.error;
}

export async function updateProgramme(
  programmeId: string,
  updates: Partial<Programme>
): Promise<Programme> {
  const existing = await repo.findById(programmeId);
  if (isSuccess(existing) && existing.value) {
    const updated = { ...existing.value, ...updates };
    const result = await repo.update(updated);
    if (isSuccess(result)) {
      return result.value;
    }
    throw result.error;
  }
  throw new Error('Programme not found');
}

export async function archiveProgramme(
  programmeId: string,
  archivedBy: string
): Promise<Programme> {
  const result = await repo.archive(programmeId, archivedBy);
  if (isSuccess(result)) {
    return result.value;
  }
  throw result.error;
}

export async function approveProgrammeRevision(
  revisionId: string,
  approvedBy: string,
  approvalDate: string,
  _effectiveDate: string
): Promise<ProgrammeRevision> {
  return {
    revisionId,
    programmeId: 'p1',
    revisionNumber: 1,
    revisionTitle: 'Approved',
    isCurrent: true,
    status: 'Approved',
    approvedAt: approvalDate,
    approvedBy,
    createdAt: new Date().toISOString(),
    createdBy: approvedBy,
  };
}

export async function archiveProgrammeRevision(
  revisionId: string,
  archivedBy: string
): Promise<ProgrammeRevision> {
  return {
    revisionId,
    programmeId: 'p1',
    revisionNumber: 1,
    revisionTitle: 'Archived',
    isCurrent: false,
    status: 'Archived',
    createdAt: new Date().toISOString(),
    createdBy: archivedBy,
  };
}

export const programmeService = {
  createProgramme,
  getProgrammeById,
  updateProgramme,
  archiveProgramme,
  approveProgrammeRevision,
  archiveProgrammeRevision,
};

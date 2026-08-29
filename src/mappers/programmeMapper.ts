import { Programme } from '@/types/programme';
import { CreateProgrammeDTO, ProgrammeResponseDTO } from '@/dto/programmeDto';

export interface IProgrammeMapper {
  toDomain(dto: CreateProgrammeDTO, actorId: string, id: string): Programme;
  toResponse(entity: Programme): ProgrammeResponseDTO;
  toPersistence(entity: Programme): Record<string, unknown>;
}

export function mapProgrammeToResponseDTO(programme: Programme): ProgrammeResponseDTO {
  return {
    id: programme.programmeId,
    code: programme.programmeCode,
    name: programme.programmeName,
    employerName: programme.employerName,
    contractorName: programme.contractorName,
    supervisingOfficer: programme.supervisingOfficer,
    status: programme.status,
    isLocked: programme.isLocked,
    currentRevisionId: programme.currentRevisionId,
    createdAt: programme.createdAt,
    createdBy: programme.createdBy,
    archivedAt: programme.archivedAt,
  };
}

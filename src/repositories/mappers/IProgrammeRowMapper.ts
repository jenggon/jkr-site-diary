import { Programme } from '@/types/programme';
import { ProgrammeRevision } from '@/types/programmeRevision';
import { ProgrammeRow, ProgrammeRevisionRow } from '../types/programmeRow';

export interface IProgrammeRowMapper {
  toDomain(row: ProgrammeRow): Programme;
  toRow(entity: Programme): ProgrammeRow;
  toRevisionDomain(row: ProgrammeRevisionRow, currentRevisionId?: string | null): ProgrammeRevision;
  toRevisionRow(entity: ProgrammeRevision): ProgrammeRevisionRow;
}

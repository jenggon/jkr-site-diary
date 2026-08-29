import { ProgrammeRevisionStatus } from '@/types/programmeRevision';
import { InvalidProgrammeStateError } from '@/errors/programmeErrors';

const ALLOWED_REVISION_TRANSITIONS: Readonly<Record<ProgrammeRevisionStatus, readonly ProgrammeRevisionStatus[]>> = Object.freeze({
  Draft: ['UnderReview', 'Approved', 'Archived'] as readonly ProgrammeRevisionStatus[],
  UnderReview: ['Approved', 'Draft', 'Archived'] as readonly ProgrammeRevisionStatus[],
  Approved: ['Superseded', 'Archived'] as readonly ProgrammeRevisionStatus[],
  Superseded: ['Archived'] as readonly ProgrammeRevisionStatus[],
  Archived: [] as readonly ProgrammeRevisionStatus[],
});

export function canTransitionProgrammeRevision(
  from: ProgrammeRevisionStatus,
  to: ProgrammeRevisionStatus
): boolean {
  const allowed = ALLOWED_REVISION_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function validateProgrammeRevisionTransition(
  from: ProgrammeRevisionStatus,
  to: ProgrammeRevisionStatus
): void {
  if (!canTransitionProgrammeRevision(from, to)) {
    throw new InvalidProgrammeStateError(`Cannot transition programme revision from '${from}' to '${to}'`);
  }
}

import { ProgrammeStatus } from '@/types/programme';
import { InvalidProgrammeStateError, ProgrammeArchivedError } from '@/errors/programmeErrors';

const ALLOWED_PROGRAMME_TRANSITIONS: Readonly<Record<ProgrammeStatus, readonly ProgrammeStatus[]>> = Object.freeze({
  Active: ['Archived'] as readonly ProgrammeStatus[],
  Archived: [] as readonly ProgrammeStatus[],
});

export function canTransitionProgramme(from: ProgrammeStatus, to: ProgrammeStatus): boolean {
  const allowed = ALLOWED_PROGRAMME_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function validateProgrammeStateTransition(from: ProgrammeStatus, to: ProgrammeStatus): void {
  if (from === 'Archived') {
    throw new ProgrammeArchivedError('Cannot transition from Archived state; it is a terminal state');
  }
  if (!canTransitionProgramme(from, to)) {
    throw new InvalidProgrammeStateError(`Cannot transition programme from '${from}' to '${to}'`);
  }
}

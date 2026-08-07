import { describe, it, expect } from 'vitest';
import {
  canTransitionProgramme,
  validateProgrammeStateTransition,
} from '@/statemachines/programmeStateMachine';
import {
  canTransitionProgrammeRevision,
  validateProgrammeRevisionTransition,
} from '@/statemachines/programmeRevisionStateMachine';
import { InvalidProgrammeStateError, ProgrammeArchivedError } from '@/errors/programmeErrors';

describe('Programme & Revision State Machines', () => {
  describe('Programme State Machine', () => {
    it('should allow transition from Active to Archived', () => {
      expect(canTransitionProgramme('Active', 'Archived')).toBe(true);
      expect(() => validateProgrammeStateTransition('Active', 'Archived')).not.toThrow();
    });

    it('should disallow transition from Archived to Active', () => {
      expect(canTransitionProgramme('Archived', 'Active')).toBe(false);
      expect(() => validateProgrammeStateTransition('Archived', 'Active')).toThrow(ProgrammeArchivedError);
    });
  });

  describe('Programme Revision State Machine', () => {
    it('should allow valid revision transition sequences', () => {
      expect(canTransitionProgrammeRevision('Draft', 'UnderReview')).toBe(true);
      expect(canTransitionProgrammeRevision('UnderReview', 'Approved')).toBe(true);
      expect(canTransitionProgrammeRevision('Approved', 'Superseded')).toBe(true);
      expect(canTransitionProgrammeRevision('Draft', 'Archived')).toBe(true);
    });

    it('should throw InvalidProgrammeStateError on illegal revision transitions', () => {
      expect(() => validateProgrammeRevisionTransition('Draft', 'Approved')).toThrow(
        InvalidProgrammeStateError
      );
      expect(() => validateProgrammeRevisionTransition('Archived', 'Draft')).toThrow(
        InvalidProgrammeStateError
      );
    });
  });
});

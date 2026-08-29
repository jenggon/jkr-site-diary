import { ActivityValidationError } from '@/errors/activityErrors';

export function validateActivityName(name: string): void {
  if (typeof name !== 'string' || name.trim().length < 3) {
    throw new ActivityValidationError('Activity name must be at least 3 characters long');
  }
  if (name.length > 150) {
    throw new ActivityValidationError('Activity name must not exceed 150 characters');
  }
}

export function validateReason(reason: string, commandName: string): void {
  if (typeof reason !== 'string' || reason.trim().length === 0) {
    throw new ActivityValidationError(`Reason is mandatory for ${commandName}`);
  }
}

export function validateManpower(manpowerCount?: number): void {
  if (manpowerCount !== undefined) {
    if (typeof manpowerCount !== 'number' || manpowerCount <= 0 || !Number.isInteger(manpowerCount)) {
      throw new ActivityValidationError('Manpower count must be a positive integer greater than zero to start activity');
    }
  }
}

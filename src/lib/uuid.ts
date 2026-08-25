import { v4 as uuidv4 } from 'uuid';

export const NIL_UUID = '00000000-0000-0000-0000-000000000000' as const;

export function generateUuid(): string {
  return uuidv4();
}

export function isValidUuid(id: string): boolean {
  if (typeof id !== 'string') {
    return false;
  }
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
}

import { Progress } from '@/types/progress';

export interface IProgressAtomicRepository {
  create(payload: Record<string, unknown>, actorId: string): Promise<Progress>;
  update(progressId: string, payload: Record<string, unknown>, actorId: string): Promise<Progress>;
}

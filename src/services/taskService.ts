import { Task } from '@/types/task';
import { taskRepository } from '@/repositories/taskRepository';

/**
 * MSP Engine Business Service
 *
 * Specs: DB-013 (task)
 * ADRs: ADR-006, ADR-009, ADR-010
 * Business Rules: BR-004, BR-012
 *
 * Responsible for MSP Engine Task business orchestration and audit metadata population.
 * Operates strictly through taskRepository and performs no direct database or infrastructure operations.
 */

/**
 * Create a new Task.
 * Populates created_at audit metadata before persistence via taskRepository.
 *
 * Specs: DB-013, BR-004
 */
export async function createTask(
  data: Omit<Task, 'task_id' | 'created_at'> & {
    task_id?: string;
    created_at?: string;
  }
): Promise<Task> {
  const createdAt = new Date().toISOString();

  return taskRepository.createTask({
    ...data,
    created_at: createdAt,
  });
}

/**
 * Retrieve a Task by its ID.
 * Delegates persistence to taskRepository.
 *
 * Specs: DB-013
 */
export async function getTaskById(taskId: string): Promise<Task | null> {
  return taskRepository.getTaskById(taskId);
}

/**
 * Retrieve a Task by Revision ID and Task UID.
 * Delegates persistence to taskRepository.
 *
 * Specs: DB-013
 */
export async function getTaskByUID(
  revisionId: string,
  taskUid: number
): Promise<Task | null> {
  return taskRepository.getTaskByUID(revisionId, taskUid);
}

/**
 * Retrieve all Tasks for a Programme Revision.
 * Delegates persistence to taskRepository.
 *
 * Specs: DB-013
 */
export async function getTasksByRevision(revisionId: string): Promise<Task[]> {
  return taskRepository.getTasksByRevision(revisionId);
}

/**
 * NOTE
 *
 * Atomic execution is required by ADR-010 where business operations require it.
 *
 * The Infrastructure layer is responsible for providing the
 * required atomic execution mechanism during a future
 * implementation task.
 *
 * This Service intentionally contains no infrastructure logic.
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Task>
): Promise<Task> {
  // NOTE:
  // ADR-010 requires this business operation to execute atomically.
  // The Infrastructure layer will provide the required implementation.
  // This Service intentionally performs business orchestration only.
  return taskRepository.updateTask(taskId, updates);
}

export const taskService = {
  createTask,
  getTaskById,
  getTaskByUID,
  getTasksByRevision,
  updateTask,
};

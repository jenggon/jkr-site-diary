import { supabase } from '@/lib/supabase';
import { Task } from '@/types/task';

/**
 * MSP Engine Repository
 *
 * Spec: DB-013 (task)
 * Bounded Context: Zon Penjadualan / MSP Engine / Task Engine
 * Primary Owner: Planning Engine
 *
 * Provides low-level persistence operations (create, read, update) for Task entities.
 * Contains no business logic, lifecycle transitions, audit timestamp generation, or MSP parsing.
 */

// ============================================================
// Task Persistence Operations
// ============================================================

/**
 * Create a new Task record in database.
 * Spec: DB-013
 */
export async function createTask(
  data: Omit<Task, 'task_id' | 'created_at'> & {
    task_id?: string;
    created_at?: string;
  }
): Promise<Task> {
  const { data: result, error } = await supabase
    .from('task')
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create task: ${error.message}`);
  }

  return result as Task;
}

/**
 * Retrieve a Task by its primary key (task_id).
 * Spec: DB-013
 */
export async function getTaskById(taskId: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from('task')
    .select('*')
    .eq('task_id', taskId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get task by ID: ${error.message}`);
  }

  return data as Task | null;
}

/**
 * Retrieve a Task by its unique composite business identity within a revision (revision_id, task_uid).
 * Spec: DB-013
 */
export async function getTaskByUID(
  revisionId: string,
  taskUid: number
): Promise<Task | null> {
  const { data, error } = await supabase
    .from('task')
    .select('*')
    .eq('revision_id', revisionId)
    .eq('task_uid', taskUid)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get task by UID: ${error.message}`);
  }

  return data as Task | null;
}

/**
 * Retrieve all Tasks belonging to a Programme Revision.
 * Spec: DB-013
 */
export async function getTasksByRevision(revisionId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('task')
    .select('*')
    .eq('revision_id', revisionId)
    .order('display_order', { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(`Failed to get tasks by revision: ${error.message}`);
  }

  return (data || []) as Task[];
}

/**
 * Update an existing Task record.
 * Spec: DB-013
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Task>
): Promise<Task> {
  const { data: result, error } = await supabase
    .from('task')
    .update(updates)
    .eq('task_id', taskId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update task: ${error.message}`);
  }

  return result as Task;
}

/**
 * Bulk insert multiple Task records into database.
 * Spec: DB-013 / S1 Ingestion
 */
export async function bulkCreateTasks(tasks: Task[]): Promise<Task[]> {
  if (!tasks || tasks.length === 0) {
    return [];
  }

  const { data: result, error } = await supabase
    .from('task')
    .insert(tasks)
    .select();

  if (error) {
    throw new Error(`Failed to bulk create tasks: ${error.message}`);
  }

  return (result || []) as Task[];
}

export const taskRepository = {
  createTask,
  bulkCreateTasks,
  getTaskById,
  getTaskByUID,
  getTasksByRevision,
  updateTask,
};

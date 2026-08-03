import { supabase } from '@/lib/supabase';
import { Audit, AuditEventType } from '@/types/audit';

/**
 * Audit Engine Repository
 *
 * Spec: DB-021 (audit)
 * Bounded Context: Zon Operasi / Audit Engine
 * Primary Owner: Audit Engine (AU)
 *
 * Provides low-level persistence operations (create, read, update) for Audit log entities.
 * Contains no business logic, validation rules, or timestamp generation.
 */

// ============================================================
// Audit Persistence Operations
// ============================================================

/**
 * Create a new Audit log record in database.
 * Spec: DB-021
 */
export async function createAudit(
  data: Omit<Audit, 'audit_id' | 'event_timestamp'> & {
    audit_id?: string;
    event_timestamp?: string;
  }
): Promise<Audit> {
  const { data: result, error } = await supabase
    .from('audit')
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create audit log: ${error.message}`);
  }

  return result as Audit;
}

/**
 * Retrieve an Audit log record by its primary key (audit_id).
 * Spec: DB-021
 */
export async function getAuditById(auditId: string): Promise<Audit | null> {
  const { data, error } = await supabase
    .from('audit')
    .select('*')
    .eq('audit_id', auditId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get audit log by ID: ${error.message}`);
  }

  return data as Audit | null;
}

/**
 * Retrieve all Audit log records belonging to a Programme.
 * Spec: DB-021
 */
export async function getAuditByProgramme(programmeId: string): Promise<Audit[]> {
  const { data, error } = await supabase
    .from('audit')
    .select('*')
    .eq('programme_id', programmeId)
    .order('event_timestamp', { ascending: false });

  if (error) {
    throw new Error(`Failed to get audit logs by programme: ${error.message}`);
  }

  return (data || []) as Audit[];
}

/**
 * Retrieve all Audit log records for a specific entity (e.g. entity_name = 'Activity', entity_id = 'uuid').
 * Spec: DB-021
 */
export async function getAuditByEntity(entityName: string, entityId: string): Promise<Audit[]> {
  const { data, error } = await supabase
    .from('audit')
    .select('*')
    .eq('entity_name', entityName)
    .eq('entity_id', entityId)
    .order('event_timestamp', { ascending: false });

  if (error) {
    throw new Error(`Failed to get audit logs by entity: ${error.message}`);
  }

  return (data || []) as Audit[];
}

/**
 * Retrieve all Audit log records performed by a specific user (performed_by).
 * Spec: DB-021
 */
export async function getAuditByUser(userId: string): Promise<Audit[]> {
  const { data, error } = await supabase
    .from('audit')
    .select('*')
    .eq('performed_by', userId)
    .order('event_timestamp', { ascending: false });

  if (error) {
    throw new Error(`Failed to get audit logs by user: ${error.message}`);
  }

  return (data || []) as Audit[];
}

/**
 * Retrieve all Audit log records filtered by event type.
 * Spec: DB-021
 */
export async function getAuditByEventType(eventType: AuditEventType): Promise<Audit[]> {
  const { data, error } = await supabase
    .from('audit')
    .select('*')
    .eq('event_type', eventType)
    .order('event_timestamp', { ascending: false });

  if (error) {
    throw new Error(`Failed to get audit logs by event type: ${error.message}`);
  }

  return (data || []) as Audit[];
}

/**
 * Update an existing Audit log record.
 * Spec: DB-021
 */
export async function updateAudit(
  auditId: string,
  updates: Partial<Audit>
): Promise<Audit> {
  const { data: result, error } = await supabase
    .from('audit')
    .update(updates)
    .eq('audit_id', auditId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update audit log: ${error.message}`);
  }

  return result as Audit;
}

export const auditRepository = {
  createAudit,
  getAuditById,
  getAuditByProgramme,
  getAuditByEntity,
  getAuditByUser,
  getAuditByEventType,
  updateAudit,
};

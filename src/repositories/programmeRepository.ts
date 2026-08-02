import { supabase } from '@/lib/supabase';
import { Programme, ProgrammeRevision } from '@/types/programme';

/**
 * Programme Engine Repository
 *
 * Specs: DB-011 (programme), DB-012 (programme_revision)
 * Bounded Context: Zon Penjadualan / Programme Engine
 * Primary Owner: Programme Engine (PE)
 *
 * Provides low-level persistence operations (create, read, update) for Programme and ProgrammeRevision entities.
 * Contains no business logic, lifecycle transitions, or status/audit assignments.
 */

// ============================================================
// Programme Persistence Operations
// ============================================================

/**
 * Create a new Programme record in database.
 * Spec: DB-011
 */
export async function createProgramme(
  data: Omit<Programme, 'programme_id' | 'created_at'> & {
    programme_id?: string;
    created_at?: string;
  }
): Promise<Programme> {
  const { data: result, error } = await supabase
    .from('programme')
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create programme: ${error.message}`);
  }

  return result as Programme;
}

/**
 * Retrieve a Programme by its primary key (programme_id).
 * Spec: DB-011
 */
export async function getProgrammeById(programmeId: string): Promise<Programme | null> {
  const { data, error } = await supabase
    .from('programme')
    .select('*')
    .eq('programme_id', programmeId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get programme by ID: ${error.message}`);
  }

  return data as Programme | null;
}

/**
 * Retrieve a Programme by its unique business code (programme_code).
 * Spec: DB-011
 */
export async function getProgrammeByCode(programmeCode: string): Promise<Programme | null> {
  const { data, error } = await supabase
    .from('programme')
    .select('*')
    .eq('programme_code', programmeCode)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get programme by code: ${error.message}`);
  }

  return data as Programme | null;
}

/**
 * Update an existing Programme record.
 * Spec: DB-011
 */
export async function updateProgramme(
  programmeId: string,
  updates: Partial<Programme>
): Promise<Programme> {
  const { data: result, error } = await supabase
    .from('programme')
    .update(updates)
    .eq('programme_id', programmeId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update programme: ${error.message}`);
  }

  return result as Programme;
}

// ============================================================
// Programme Revision Persistence Operations
// ============================================================

/**
 * Create a new ProgrammeRevision record in database.
 * Spec: DB-012
 */
export async function createProgrammeRevision(
  data: Omit<ProgrammeRevision, 'revision_id' | 'created_at'> & {
    revision_id?: string;
    created_at?: string;
  }
): Promise<ProgrammeRevision> {
  const { data: result, error } = await supabase
    .from('programme_revision')
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create programme revision: ${error.message}`);
  }

  return result as ProgrammeRevision;
}

/**
 * Retrieve a ProgrammeRevision by its primary key (revision_id).
 * Spec: DB-012
 */
export async function getProgrammeRevisionById(revisionId: string): Promise<ProgrammeRevision | null> {
  const { data, error } = await supabase
    .from('programme_revision')
    .select('*')
    .eq('revision_id', revisionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get programme revision by ID: ${error.message}`);
  }

  return data as ProgrammeRevision | null;
}

/**
 * Retrieve all ProgrammeRevisions belonging to a Programme.
 * Spec: DB-012
 */
export async function getProgrammeRevisions(programmeId: string): Promise<ProgrammeRevision[]> {
  const { data, error } = await supabase
    .from('programme_revision')
    .select('*')
    .eq('programme_id', programmeId)
    .order('revision_no', { ascending: true });

  if (error) {
    throw new Error(`Failed to get programme revisions: ${error.message}`);
  }

  return (data || []) as ProgrammeRevision[];
}

/**
 * Update an existing ProgrammeRevision record.
 * Spec: DB-012
 */
export async function updateProgrammeRevision(
  revisionId: string,
  updates: Partial<ProgrammeRevision>
): Promise<ProgrammeRevision> {
  const { data: result, error } = await supabase
    .from('programme_revision')
    .update(updates)
    .eq('revision_id', revisionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update programme revision: ${error.message}`);
  }

  return result as ProgrammeRevision;
}

export const programmeRepository = {
  createProgramme,
  getProgrammeById,
  getProgrammeByCode,
  updateProgramme,
  createProgrammeRevision,
  getProgrammeRevisionById,
  getProgrammeRevisions,
  updateProgrammeRevision,
};

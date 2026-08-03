import { Workforce } from '@/types/workforce';
import { workforceRepository } from '@/repositories/workforceRepository';

/**
 * Workforce Engine Business Service
 *
 * Specs: DB-017 (workforce)
 * ADRs: ADR-007, ADR-009, ADR-010
 * Business Rules: WF-001, WF-002, WF-003
 *
 * Responsible for Workforce Engine business orchestration, audit metadata population,
 * and default count initialization.
 * Operates strictly through workforceRepository with zero direct database access.
 */

/**
 * Create a new Workforce record.
 * Populates created_at audit metadata and default counts before persistence.
 *
 * Specs: DB-017, WF-001
 */
export async function createWorkforce(
  data: Omit<Workforce, 'workforce_id' | 'created_at' | 'total_count'> & {
    workforce_id?: string;
    created_at?: string;
    total_count?: number;
  }
): Promise<Workforce> {
  const createdAt = new Date().toISOString();
  const bumiputeraCount = data.bumiputera_count ?? 0;
  const nonBumiputeraCount = data.non_bumiputera_count ?? 0;
  const foreignCount = data.foreign_count ?? 0;

  return workforceRepository.createWorkforce({
    ...data,
    bumiputera_count: bumiputeraCount,
    non_bumiputera_count: nonBumiputeraCount,
    foreign_count: foreignCount,
    created_at: createdAt,
  });
}

/**
 * Retrieve a Workforce record by its ID.
 * Delegates persistence to workforceRepository.
 *
 * Specs: DB-017
 */
export async function getWorkforceById(workforceId: string): Promise<Workforce | null> {
  return workforceRepository.getWorkforceById(workforceId);
}

/**
 * Retrieve all Workforce records belonging to a Site Diary entry.
 * Delegates persistence to workforceRepository.
 *
 * Specs: DB-017
 */
export async function getWorkforceBySiteDiary(siteDiaryId: string): Promise<Workforce[]> {
  return workforceRepository.getWorkforceBySiteDiary(siteDiaryId);
}

/**
 * Retrieve all Workforce records belonging to an Activity.
 * Delegates persistence to workforceRepository.
 *
 * Specs: DB-017
 */
export async function getWorkforceByActivity(activityId: string): Promise<Workforce[]> {
  return workforceRepository.getWorkforceByActivity(activityId);
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
export async function updateWorkforce(
  workforceId: string,
  updates: Partial<Workforce>
): Promise<Workforce> {
  // NOTE:
  // ADR-010 requires this business operation to execute atomically.
  // The Infrastructure layer will provide the required implementation.
  // This Service intentionally performs business orchestration only.
  const updatedAt = new Date().toISOString();

  return workforceRepository.updateWorkforce(workforceId, {
    ...updates,
    updated_at: updatedAt,
  });
}

export const workforceService = {
  createWorkforce,
  getWorkforceById,
  getWorkforceBySiteDiary,
  getWorkforceByActivity,
  updateWorkforce,
};

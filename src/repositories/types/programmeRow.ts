export interface ProgrammeRow {
  readonly programme_id: string;
  readonly programme_code: string;
  readonly programme_name: string;
  readonly employer_name: string | null;
  readonly contractor_name: string | null;
  readonly supervising_officer: string | null;
  readonly contract_start_date: string | null;
  readonly contract_completion_date: string | null;
  readonly defect_liability_end: string | null;
  readonly current_revision_id: string | null;
  readonly status: 'Active' | 'Archived';
  readonly is_locked: boolean;
  readonly created_at: string;
  readonly created_by: string;
  readonly updated_at: string | null;
  readonly updated_by: string | null;
  readonly archived_at: string | null;
  readonly archived_by: string | null;
}

export interface ProgrammeRevisionRow {
  readonly revision_id: string;
  readonly programme_id: string;
  readonly revision_number: number;
  readonly revision_title: string;
  readonly is_current: boolean;
  readonly status: 'Draft' | 'UnderReview' | 'Approved' | 'Superseded' | 'Archived';
  readonly description: string | null;
  readonly approved_at: string | null;
  readonly approved_by: string | null;
  readonly created_at: string;
  readonly created_by: string;
  readonly updated_at: string | null;
  readonly updated_by: string | null;
}

export type ProgrammeRevisionStatus =
  | 'Draft'
  | 'UnderReview'
  | 'Approved'
  | 'Superseded'
  | 'Archived';

export interface ProgrammeRevision {
  readonly revisionId: string;
  readonly programmeId: string;
  readonly revisionNumber: number;
  readonly revisionTitle: string;
  readonly isCurrent: boolean;
  readonly status: ProgrammeRevisionStatus;
  readonly msp_file_hash?: string | null;
  readonly description?: string | undefined;
  readonly approvedAt?: string | undefined;
  readonly approvedBy?: string | undefined;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly updatedAt?: string | undefined;
  readonly updatedBy?: string | undefined;
}

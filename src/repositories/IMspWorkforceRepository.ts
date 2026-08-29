export interface MspWorkforceResourceRecord {
  readonly roleCode: string;
  readonly tradeId: string;
  readonly tradeCode: string;
  readonly tradeName: string;
  readonly allocatedCount: number;
  readonly skillLevel: string;
  readonly isMandatory: boolean;
}

export interface IMspWorkforceRepository {
  findWorkforceByMspTask(
    programmeId: string,
    mspTaskId: string
  ): Promise<readonly MspWorkforceResourceRecord[] | null>;
}

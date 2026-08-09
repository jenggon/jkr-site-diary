export interface ProgramKerjaTradeInfo {
  readonly tradeId: string;
  readonly tradeCode: string;
  readonly tradeName: string;
  readonly tradeCategory?: string | undefined;
}

export interface ProgramKerjaWorkforceInfo {
  readonly type: string;
  readonly count: number;
}

export interface ProgramKerjaMaterialInfo {
  readonly materialCode: string;
  readonly materialName: string;
  readonly quantity: number;
  readonly unit: string;
  readonly estimatedCost?: number | undefined;
}

export interface IProgramKerjaBoundaryService {
  getProgramKerjaTrade(programmeId: string, taskId: string): Promise<ProgramKerjaTradeInfo | null>;
  getProgramKerjaWorkforce(programmeId: string, taskId: string): Promise<ProgramKerjaWorkforceInfo[] | null>;
  getProgramKerjaMaterials(programmeId: string, taskId: string): Promise<ProgramKerjaMaterialInfo[] | null>;
}

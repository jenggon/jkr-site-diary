/**
 * Program Kerja Operational Boundary DTOs
 *
 * Project: JKR Site Diary Platform
 * Architecture Decision: Decision D1 (Program Kerja Operational Boundary)
 * Specs: ADR-011
 */

/** Explicit scheduling-derived Trade DTO for Zon Operasi consumption */
export interface ProgramKerjaTradeDTO {
  readonly tradeId: string;
  readonly tradeCode: string;
  readonly tradeName: string;
  readonly tradeCategory: string | null;
}

/** Explicit scheduling-derived Workforce DTO for Zon Operasi consumption */
export interface ProgramKerjaWorkforceDTO {
  readonly roleCode: string;
  readonly tradeId: string;
  readonly tradeCode: string;
  readonly tradeName: string;
  readonly allocatedCount: number;
  readonly skillLevel: string;
  readonly isMandatory: boolean;
}

/** Explicit scheduling-derived Material DTO for Zon Operasi consumption */
export interface ProgramKerjaMaterialDTO {
  readonly materialCode: string;
  readonly materialName: string;
  readonly materialRole: string;
  readonly recommendedQuantity: number;
  readonly unitOfMeasure: string;
  readonly isMandatory: boolean;
  readonly estimatedWastePercentage: number | null;
  readonly estimatedCost: number | null;
  readonly estimatedLeadTime: number | null;
}

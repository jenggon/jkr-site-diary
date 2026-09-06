export type OperationalSourceCode = 'MSP' | 'VO';

export const OPERATIONAL_SOURCE_LABELS: Readonly<Record<OperationalSourceCode, string>> = {
  MSP: 'Skop Kontrak',
  VO: 'Perubahan Skop (VO)',
};

export function operationalSourceLabel(value: string | null | undefined): string {
  if (value === 'MSP' || value === 'VO') return OPERATIONAL_SOURCE_LABELS[value];
  return value?.trim() || 'Tidak tersedia';
}

export function operationalSourceMark(value: OperationalSourceCode): string {
  return value === 'MSP' ? 'SKOP' : 'VO';
}

export type WorkforceScope = 'CONTRACTOR' | 'NSC';

export type WorkforceManpower = {
  trade_name: string;
  bumi_count?: number;
  non_bumi_count?: number;
  foreign_count?: number;
};

export type WorkforceReport = {
  contractor_scope: WorkforceScope;
  manpower: WorkforceManpower[];
};

export type WorkforceRow = {
  trade: string;
  bumi: number;
  nonBumi: number;
  foreign: number;
};

export const PAGE1_CONTRACTOR_CAPACITY = 9;
export const PAGE1_NSC_CAPACITY = 6;
export const CONTINUATION_CONTRACTOR_CAPACITY = 6;
export const CONTINUATION_NSC_CAPACITY = 4;

type WorkforcePage = {
  contractor: WorkforceRow[];
  nsc: WorkforceRow[];
};

export type WorkforcePagination = {
  page1: WorkforcePage;
  continuations: WorkforcePage[];
};

function aggregateWorkforce(reports: WorkforceReport[], scope: WorkforceScope): WorkforceRow[] {
  const rows = new Map<string, WorkforceRow>();

  for (const report of reports) {
    if (report.contractor_scope !== scope) continue;

    for (const item of report.manpower ?? []) {
      const trade = item.trade_name?.trim();
      if (!trade) continue;

      const current = rows.get(trade) ?? { trade, bumi: 0, nonBumi: 0, foreign: 0 };
      current.bumi += Number(item.bumi_count ?? 0);
      current.nonBumi += Number(item.non_bumi_count ?? 0);
      current.foreign += Number(item.foreign_count ?? 0);
      rows.set(trade, current);
    }
  }

  // Map iteration retains the exact DTO's first-seen trade order.
  return [...rows.values()];
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function paginateWorkforce(reports: WorkforceReport[]): WorkforcePagination {
  const contractor = aggregateWorkforce(reports, 'CONTRACTOR');
  const nsc = aggregateWorkforce(reports, 'NSC');
  const contractorContinuations = chunk(
    contractor.slice(PAGE1_CONTRACTOR_CAPACITY),
    CONTINUATION_CONTRACTOR_CAPACITY,
  );
  const nscContinuations = chunk(
    nsc.slice(PAGE1_NSC_CAPACITY),
    CONTINUATION_NSC_CAPACITY,
  );
  const continuationCount = Math.max(contractorContinuations.length, nscContinuations.length);

  return {
    page1: {
      contractor: contractor.slice(0, PAGE1_CONTRACTOR_CAPACITY),
      nsc: nsc.slice(0, PAGE1_NSC_CAPACITY),
    },
    continuations: Array.from({ length: continuationCount }, (_, index) => ({
      contractor: contractorContinuations[index] ?? [],
      nsc: nscContinuations[index] ?? [],
    })),
  };
}

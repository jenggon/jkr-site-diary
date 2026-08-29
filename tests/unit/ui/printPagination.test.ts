import { describe, expect, it } from 'vitest';
import {
  CONTINUATION_CONTRACTOR_CAPACITY,
  CONTINUATION_NSC_CAPACITY,
  PAGE1_CONTRACTOR_CAPACITY,
  PAGE1_NSC_CAPACITY,
  paginateWorkforce,
  WorkforceReport,
  WorkforceScope,
} from '@/app/site-diary/print/printPagination';

function report(scope: WorkforceScope, count: number, prefix: string = scope): WorkforceReport {
  return {
    contractor_scope: scope,
    manpower: Array.from({ length: count }, (_, index) => ({
      trade_name: `${prefix}-${String(index + 1).padStart(2, '0')}`,
      bumi_count: index + 1,
      non_bumi_count: (index + 1) * 2,
      foreign_count: (index + 1) * 3,
    })),
  };
}

function flattenedTrades(result: ReturnType<typeof paginateWorkforce>, scope: 'contractor' | 'nsc') {
  return [result.page1[scope], ...result.continuations.map(page => page[scope])]
    .flat()
    .map(row => row.trade);
}

describe('F2.5-B03 workforce pagination', () => {
  it('locks Page 1 and continuation capacities independently of pagination output', () => {
    expect(PAGE1_CONTRACTOR_CAPACITY).toBe(9);
    expect(PAGE1_NSC_CAPACITY).toBe(6);
    expect(CONTINUATION_CONTRACTOR_CAPACITY).toBe(6);
    expect(CONTINUATION_NSC_CAPACITY).toBe(4);
  });

  it.each([0, 9, 10, 15, 16, 28])(
    'partitions %i Contractor rows at locked 9/6 capacities without loss or duplication',
    count => {
      const result = paginateWorkforce([report('CONTRACTOR', count)]);
      const expected = report('CONTRACTOR', count).manpower.map(row => row.trade_name);

      expect(result.page1.contractor).toHaveLength(Math.min(count, PAGE1_CONTRACTOR_CAPACITY));
      expect(result.continuations.every(page => page.contractor.length <= CONTINUATION_CONTRACTOR_CAPACITY)).toBe(true);
      expect(flattenedTrades(result, 'contractor')).toEqual(expected);
      expect(flattenedTrades(result, 'nsc')).toEqual([]);
      expect(new Set(flattenedTrades(result, 'contractor')).size).toBe(count);
    },
  );

  it.each([0, 6, 7, 10, 11, 19])(
    'partitions %i NSC rows at locked 6/4 capacities without loss or duplication',
    count => {
      const result = paginateWorkforce([report('NSC', count)]);
      const expected = report('NSC', count).manpower.map(row => row.trade_name);

      expect(result.page1.nsc).toHaveLength(Math.min(count, PAGE1_NSC_CAPACITY));
      expect(result.continuations.every(page => page.nsc.length <= CONTINUATION_NSC_CAPACITY)).toBe(true);
      expect(flattenedTrades(result, 'nsc')).toEqual(expected);
      expect(flattenedTrades(result, 'contractor')).toEqual([]);
      expect(new Set(flattenedTrades(result, 'nsc')).size).toBe(count);
    },
  );

  it('preserves first-seen order and exact demographic counts when duplicate trades aggregate', () => {
    const result = paginateWorkforce([
      {
        contractor_scope: 'CONTRACTOR',
        manpower: [
          { trade_name: 'Zink', bumi_count: 1, non_bumi_count: 2, foreign_count: 3 },
          { trade_name: 'Awning', bumi_count: 4, non_bumi_count: 5, foreign_count: 6 },
          { trade_name: 'Zink', bumi_count: 7, non_bumi_count: 8, foreign_count: 9 },
        ],
      },
    ]);

    expect(result.page1.contractor).toEqual([
      { trade: 'Zink', bumi: 8, nonBumi: 10, foreign: 12 },
      { trade: 'Awning', bumi: 4, nonBumi: 5, foreign: 6 },
    ]);
  });

  it.each([
    { contractor: 16, nsc: 6, pages: 2 },
    { contractor: 9, nsc: 11, pages: 2 },
    { contractor: 16, nsc: 19, pages: 4 },
    { contractor: 9, nsc: 6, pages: 0 },
  ])(
    'synchronizes $pages continuation pages for Contractor=$contractor and NSC=$nsc',
    ({ contractor, nsc, pages }) => {
      const result = paginateWorkforce([
        report('CONTRACTOR', contractor, 'C'),
        report('NSC', nsc, 'N'),
      ]);

      expect(result.continuations).toHaveLength(pages);
      expect(flattenedTrades(result, 'contractor')).toHaveLength(contractor);
      expect(flattenedTrades(result, 'nsc')).toHaveLength(nsc);
      if (pages > 0) {
        expect(result.continuations.at(-1)).toBeDefined();
      }
    },
  );

  it('renders an empty companion scope on synchronized continuation pages', () => {
    const result = paginateWorkforce([
      report('CONTRACTOR', PAGE1_CONTRACTOR_CAPACITY + CONTINUATION_CONTRACTOR_CAPACITY + 1),
      report('NSC', PAGE1_NSC_CAPACITY),
    ]);

    expect(result.continuations).toHaveLength(2);
    expect(result.continuations.map(page => page.nsc)).toEqual([[], []]);
    expect(result.continuations.map(page => page.contractor.length)).toEqual([6, 1]);
  });
});

import { expect, Page, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { PAGE1_CONTRACTOR_CAPACITY, PAGE1_NSC_CAPACITY } from '../../src/app/site-diary/print/printPagination';

const F = {
  single: { id: 'b02b3000-0000-4000-8000-000000000001', revision: '33333333-3333-3333-3333-333333333333', task: 'Pemasangan tetulang rasuk utama Blok Pentadbiran' },
  overflow: { id: 'b02b3000-0000-4000-8000-000000000002', revision: '33333333-3333-3333-3333-333333333333', task: 'Penuangan konkrit papak podium dan pemeriksaan kemasan permukaan' },
  historical: { id: 'b02b3000-0000-4000-8000-000000000003', revision: '77777777-7777-7777-7777-777777777777', task: 'Kerja konkrit aras sejarah untuk pengesahan cetakan tepat' },
  foreign: 'b02b3000-0000-4000-8000-000000000004',
  missing: 'b02b3000-0000-4000-8000-000000009999',
} as const;

const USERS = {
  submitter: { email: 'submitter@jkr.gov.my', password: 'password123' },
  programmeAOnly: { email: 'reviewer@jkr.gov.my', password: 'password123' },
} as const;
const INTERNAL_ERROR = /42501|permission denied for table|Database error \[|PostgREST|SQLSTATE|"stack"\s*:/i;

type PrintDto = { siteDiaryId: string; revisionId: string; isHistorical: boolean; isCurrentRevision: boolean };
type Section = { rows: Array<{ trade: string; bumi: number; nonBumi: number; foreign: number }>; totals: { bumi: number; nonBumi: number; foreign: number } };
type WorkforcePage = { contractor: Section; nsc: Section };

test.describe('F2.7-B02-B Print/PDF Acceptance', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(90_000);

  test.afterEach(async ({ page }) => {
    if (!page.isClosed()) expect(await page.locator('body').innerText()).not.toMatch(INTERNAL_ERROR);
  });

  async function login(page: Page, user: { email: string; password: string } = USERS.submitter) {
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await page.context().clearCookies();
    await page.goto('/login');
    await page.getByLabel('Alamat Emel').fill(user.email);
    await page.getByLabel('Kata Laluan').fill(user.password);
    const token = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password';
    });
    await page.getByRole('button', { name: 'Log Masuk Sekarang' }).click();
    expect((await token).status()).toBe(200);
    await page.waitForURL((url) => url.pathname === '/site-diary', { timeout: 30_000 });
  }

  async function openPrint(page: Page, id: string) {
    const path = `/api/site-diary/${id}/print`;
    const pending = page.waitForResponse((response) => new URL(response.url()).pathname === path);
    await page.goto(`/site-diary/print?id=${id}`);
    const response = await pending;
    expect(new URL(response.url()).pathname).toBe(path);
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { data: PrintDto };
    expect(body.data.siteDiaryId).toBe(id);
    await expect(page.locator('.status')).toHaveText('1 aktiviti');
    return body.data;
  }

  async function expectStatus(page: Page, task: string, selected: 3 | 4 | 5) {
    const cells = page.locator('.activity-table tbody tr').filter({ hasText: task }).first().locator('td');
    for (let index = 3; index <= 5; index += 1) {
      await expect(cells.nth(index)).toHaveText(index === selected ? '✓' : '');
    }
  }

  async function workforce(page: Page): Promise<WorkforcePage[]> {
    return page.locator('.page').evaluateAll((pages) => pages.map((pageNode) => {
      const blank = (): Section => ({ rows: [], totals: { bumi: 0, nonBumi: 0, foreign: 0 } });
      const result: WorkforcePage = { contractor: blank(), nsc: blank() };
      let scope: keyof WorkforcePage | null = null;
      for (const row of pageNode.querySelectorAll<HTMLTableRowElement>('.workforce-table tbody tr')) {
        const cells = Array.from(row.cells);
        const text = row.textContent?.trim() ?? '';
        if (row.classList.contains('group-row')) { scope = text === 'Kontraktor' ? 'contractor' : 'nsc'; continue; }
        if (!scope) continue;
        const value = (cell: HTMLTableCellElement | undefined) => Number(cell?.textContent?.trim() || 0);
        if (cells[0]?.colSpan === 2 && cells[0].textContent?.trim() === 'Jumlah') {
          result[scope].totals = { bumi: value(cells[1]), nonBumi: value(cells[2]), foreign: value(cells[3]) };
          continue;
        }
        const trade = cells[1]?.textContent?.trim() ?? '';
        if (trade) result[scope].rows.push({ trade, bumi: value(cells[2]), nonBumi: value(cells[3]), foreign: value(cells[4]) });
      }
      return result;
    }));
  }

  async function expectA4(page: Page) {
    await page.emulateMedia({ media: 'print' });
    const metrics = await page.locator('.page').evaluateAll((pages) => pages.map((node) => {
      const element = node as HTMLElement;
      const rect = element.getBoundingClientRect();
      const descendants = Array.from(element.querySelectorAll<HTMLElement>('*'));
      const key = Array.from(element.querySelectorAll<HTMLElement>('.activity-table td,.workforce-table td,.weather-fields,.footer-note'));
      return {
        width: rect.width,
        height: rect.height,
        horizontal: element.scrollWidth - element.clientWidth,
        vertical: Math.max(rect.top, ...descendants.map((child) => child.getBoundingClientRect().bottom)) - rect.bottom,
        clipped: key.filter((child) => child.clientWidth > 0 && child.scrollWidth > child.clientWidth + 1).map((child) => child.textContent?.trim().slice(0, 60)),
      };
    }));
    const width = 210 / 25.4 * 96;
    const height = 297 / 25.4 * 96;
    for (const metric of metrics) {
      expect(Math.abs(metric.width - width)).toBeLessThanOrEqual(2);
      expect(metric.height).toBeLessThanOrEqual(height + 2);
      expect(metric.horizontal).toBeLessThanOrEqual(1);
      expect(metric.vertical).toBeLessThanOrEqual(1);
      expect(metric.clipped).toEqual([]);
    }
  }

  function pdfPages(pdf: Buffer) { return pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length ?? 0; }
  async function pdf(page: Page, name: string) {
    const directory = process.env.B02B_PDF_OUTPUT_DIR;
    if (directory) {
      mkdirSync(directory, { recursive: true });
      return page.pdf({ path: join(directory, name), printBackground: true, preferCSSPageSize: true });
    }
    return page.pdf({ printBackground: true, preferCSSPageSize: true });
  }

  test('CURRENT_SINGLE_PAGE proves exact current DTO, structure, fields, NSC, print media, and 1/1', async ({ page }) => {
    await login(page);
    const dto = await openPrint(page, F.single.id);
    expect(dto).toMatchObject({ revisionId: F.single.revision, isCurrentRevision: true, isHistorical: false });
    await expect(page.locator('.page')).toHaveCount(1);
    await expect(page.locator('.page-number')).toHaveText('1/1');
    await expect(page.getByText('SAMBUNGAN', { exact: false })).toHaveCount(0);
    await expect(page.locator('.toolbar')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cetak / Simpan PDF' })).toBeVisible();
    for (const selector of ['.jkr-header', '.weather-row', '.activity-table', '.workforce-table', '.footer-note', '.page-number']) await expect(page.locator(selector)).toBeVisible();
    for (const text of ['22/08/2026', 'B02B.SINGLE.PAGE.001.LONG-WBS', F.single.task, 'Aras 2, Zon Timur, Blok Pentadbiran Utama', '08:15', '17:05', 'HUJAN', '10:30', '11:45', 'Pemeriksaan tetulang selesai; ruang kerja selamat dan teratur.']) await expect(page.getByText(text, { exact: true })).toBeVisible();
    await expectStatus(page, F.single.task, 3);
    const pages = await workforce(page);
    expect(pages[0]?.contractor.rows).toEqual([]);
    expect(pages[0]?.nsc.rows.map((row) => row.trade)).toEqual(['Tukang Besi NSC', 'Penyelia Keselamatan NSC']);
    expect(pages[0]?.nsc.rows.length).toBeLessThanOrEqual(PAGE1_NSC_CAPACITY);
    expect(pages[0]?.nsc.totals).toEqual({ bumi: 4, nonBumi: 1, foreign: 0 });
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.toolbar')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Cetak / Simpan PDF' })).toBeHidden();
    await expectA4(page);
  });

  test('CURRENT_OVERFLOW preserves ten Contractor rows once with page-local totals', async ({ page }) => {
    const expected = ['Jurutera Tapak Kontraktor Utama', 'Penyelia Penuangan Konkrit', 'Tukang Konkrit Kemasan Permukaan', 'Tukang Besi Tetulang Podium', 'Tukang Kayu Acuan Papak', 'Operator Pam Konkrit Bergerak', 'Pemandu Lori Bancuhan Konkrit', 'Pegawai Keselamatan dan Kesihatan', 'Juruukur Aras dan Penjajaran', 'Pekerja Am Pembersihan Tapak'];
    await login(page);
    expect(await openPrint(page, F.overflow.id)).toMatchObject({ revisionId: F.overflow.revision, isCurrentRevision: true, isHistorical: false });
    await expect(page.locator('.page-number')).toHaveText(['1/2', '2/2']);
    await expectStatus(page, F.overflow.task, 4);
    for (const text of ['23/08/2026', 'B02B.OVERFLOW.002.LONG-WBS', 'Podium Utama, Grid A1 hingga H8, Laluan Logistik Timur', '07:00', '19:15', 'ELOK', 'Penuangan berperingkat diteruskan mengikut kaedah kerja diluluskan; pemeriksaan mutu setiap zon direkodkan.']) await expect(page.getByText(text, { exact: true }).first()).toBeVisible();
    const pages = await workforce(page);
    expect(pages).toHaveLength(2);
    expect(pages[0]?.contractor.rows).toHaveLength(PAGE1_CONTRACTOR_CAPACITY);
    expect(pages[0]?.contractor.rows.length).toBeLessThanOrEqual(PAGE1_CONTRACTOR_CAPACITY);
    expect(pages[1]?.contractor.rows).toHaveLength(1);
    expect(pages.every((entry) => entry.nsc.rows.length === 0)).toBe(true);
    expect(pages[0]?.contractor.totals).toEqual({ bumi: 22, nonBumi: 3, foreign: 9 });
    expect(pages[1]?.contractor.totals).toEqual({ bumi: 3, nonBumi: 1, foreign: 2 });
    const rendered = pages.flatMap((entry) => entry.contractor.rows.map((row) => row.trade));
    expect(rendered).toEqual(expected);
    for (const trade of expected) expect(rendered.filter((value) => value === trade)).toHaveLength(1);
    await expectA4(page);
  });

  test('HISTORICAL_EXACT stays on its original superseded revision and maps Completed to Siap', async ({ page }) => {
    await login(page);
    expect(await openPrint(page, F.historical.id)).toMatchObject({ revisionId: F.historical.revision, isHistorical: true, isCurrentRevision: false });
    for (const text of [F.historical.task, '02/08/2026', 'Aras 3, Blok Sejarah', '07:30', '16:30', 'MENDUNG', '12:00', '13:00', 'Catatan sejarah tepat kekal pada semakan asal.']) await expect(page.getByText(text, { exact: true }).first()).toBeVisible();
    await expectStatus(page, F.historical.task, 5);
  });

  test('real Chromium PDFs equal intended DOM page counts with no blank physical page', async ({ page }) => {
    await login(page);
    await openPrint(page, F.single.id);
    const single = await pdf(page, 'b02b-current-single.pdf');
    expect(pdfPages(single)).toBe(1);
    await openPrint(page, F.overflow.id);
    const domPages = await page.locator('.page').count();
    const overflow = await pdf(page, 'b02b-current-overflow.pdf');
    expect(domPages).toBe(2);
    expect(pdfPages(overflow)).toBe(domPages);
    console.log(`[B02-B PDF] single=${pdfPages(single)} overflow=${pdfPages(overflow)}`);
  });

  test('missing id is bounded without a print API request', async ({ page }) => {
    await login(page);
    const requests: string[] = [];
    page.on('request', (request) => { const path = new URL(request.url()).pathname; if (path.startsWith('/api/site-diary/') && path.endsWith('/print')) requests.push(path); });
    await page.goto('/site-diary/print');
    await expect(page.getByTestId('error-state')).toHaveText('ID rekod tidak ditemui');
    expect(requests).toEqual([]);
  });

  test('invalid, nonexistent, and foreign IDs return exact safe statuses and bounded UI', async ({ page }) => {
    await login(page);
    for (const item of [{ id: 'not-a-valid-uuid', status: 400, ui: 'Permintaan tidak sah. ID rekod tidak boleh diproses.' }, { id: F.missing, status: 404, ui: 'Rekod tidak dijumpai.' }]) {
      const path = `/api/site-diary/${item.id}/print`;
      const pending = page.waitForResponse((response) => new URL(response.url()).pathname === path);
      await page.goto(`/site-diary/print?id=${item.id}`);
      expect((await pending).status()).toBe(item.status);
      await expect(page.getByTestId('error-state')).toHaveText(item.ui);
    }
    await login(page, USERS.programmeAOnly);
    const foreignPath = `/api/site-diary/${F.foreign}/print`;
    const foreign = page.waitForResponse((response) => new URL(response.url()).pathname === foreignPath);
    await page.goto(`/site-diary/print?id=${F.foreign}`);
    expect((await foreign).status()).toBe(403);
    await expect(page.getByTestId('error-state')).toHaveText('Akses ditolak. Anda tidak mempunyai kebenaran untuk melihat rekod ini.');
  });
});

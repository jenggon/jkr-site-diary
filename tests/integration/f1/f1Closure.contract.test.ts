import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('F1 Golden Path closure contract', () => {
  it('preserves the locked JKR Page 1 printable structure and continuation derivation', () => {
    const renderer = read('src/app/site-diary/print/PrintSiteDiaryClient.tsx');

    expect(renderer).toContain('JABATAN KERJA RAYA');
    expect(renderer).toContain('MALAYSIA');
    expect(renderer).toContain('TARIKH:');
    expect(renderer).toContain('CUACA:');
    expect(renderer).toContain('WAKTU MULA HUJAN:');
    expect(renderer).toContain('WAKTU TAMAT HUJAN:');
    expect(renderer).toContain('CATATAN:');
    expect(renderer).toContain('KERJA YANG DIBINA HARI INI');
    expect(renderer).toContain('Status Kemajuan');
    expect(renderer).toContain('Lokasi Aktiviti/Kerja');
    expect(renderer).toContain('Waktu Mula');
    expect(renderer).toContain('Waktu Tamat');
    expect(renderer).toContain('BILANGAN PEKERJA DI TAPAK BINA');
    expect(renderer).toContain('Bumiputera');
    expect(renderer).toContain('Bukan Bumi');
    expect(renderer).toContain('Warga Asing');
    expect(renderer).toContain('Subkontraktor Dinamakan (NSC)');
    expect(renderer).toContain('SAMBUNGAN');
    expect(renderer).toContain('window.print()');
    expect(renderer).toContain('@media print');

    // Continuation pages are deliberately derived without first-page-only blocks.
    const continuation = renderer.slice(renderer.indexOf("continuationCount"));
    expect(continuation).toContain('continuation-page');
    expect(continuation).toContain('ActivityTable');
    expect(continuation).toContain('WorkforceBlock');
  });

  it('keeps Activity source identity exclusive: MSP Task XOR VO Item', () => {
    const migration = read('supabase/migrations/20260816143500_f1_activity_dual_source.sql');
    const domain = read('docs/03_Domain_Model/DM-005-Activity.md');

    expect(migration).toContain('source_type');
    expect(migration).toContain('vo_item_id');
    expect(migration).toMatch(/task_id[\s\S]*vo_item_id|vo_item_id[\s\S]*task_id/);
    expect(domain).toContain('MSP');
    expect(domain).toContain('VO');
  });

  it('keeps Continue Yesterday inside the current authorised revision and duplicate-safe', () => {
    const service = read('src/services/siteDiaryService.ts');

    expect(service).toContain('Cannot carry forward a Completed activity');
    expect(service).toContain("revision.status !== 'Approved' || !revision.isCurrent");
    expect(service).toContain('getSiteDiaryByActivityAndDate(activityId, targetDate)');
    expect(service).toContain('if (existingDiary) return Success(existingDiary)');
  });

  it('keeps Site Diary create/update coupled to canonical Workforce transactions', () => {
    const repository = read('src/repositories/atomic/ResidualAtomicRepository.ts');
    const createMigration = read('supabase/migrations/20260816162000_f1_site_diary_workforce_atomic.sql');
    const updateMigration = read('supabase/migrations/20260816164000_f1_site_diary_workforce_update_atomic.sql');

    expect(repository).toContain('f1_create_site_diary_with_workforce_atomic');
    expect(repository).toContain('f1_update_site_diary_with_workforce_atomic');
    expect(createMigration).toContain('a27_mutate_workforce_core');
    expect(updateMigration).toContain('a27_mutate_workforce_core');
  });
});

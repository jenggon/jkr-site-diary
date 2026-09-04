import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const seal = source('src/app/ngamsoi-f45-seal.css');
const smartWorkforce = source('src/app/site-diary/SmartWorkforceEntry.tsx');
const postSave = source('src/app/site-diary/PostSaveConfirmation.tsx');

describe('F4.5 physical visual seal contract', () => {
  it('forces sharp operational surfaces while preserving only semantic circular exceptions', () => {
    expect(seal).toContain("--ng-f45-radius: 0;");
    expect(seal).toContain("--ng-f45-radius-small: 0;");
    expect(seal).toContain(".ngamsoi-shell [class*='rounded']");
    expect(seal).toContain('border-radius: 0 !important;');
    expect(seal).toContain('.ng-profile-trigger');
    expect(seal).toContain('border-radius: 999px !important;');
    expect(seal).toContain("form[aria-label='Borang Buku Harian Tapak'] > .ng-entry-step[data-entry-step]::before");
    expect(seal).toContain('border-radius: 50% !important;');
  });

  it('gives explicit Spine state higher authority than legacy structural selectors', () => {
    expect(seal).toContain("[data-spine-state='complete']::before");
    expect(seal).toContain("content: '✓' !important;");
    expect(seal).toContain('background: var(--ng-f45-success) !important;');
    expect(seal).toContain("padding-left: 0 !important;");
    expect(seal).toContain('left: calc(var(--ng-spine-x) - var(--ng-step-offset) - .38rem) !important;');
  });

  it('restores the workforce hardhat glyph without re-enabling the hidden legacy header', () => {
    expect(smartWorkforce).toContain('function WorkforceHardhatIcon()');
    expect(smartWorkforce).toContain('className="ng-workforce__overall-icon"');
    expect(smartWorkforce).toContain('<WorkforceHardhatIcon />');
    expect(smartWorkforce).not.toContain('◒');
  });

  it('keeps success acknowledgement visible and puts record inspection before adding another activity', () => {
    expect(postSave.indexOf('Tunjuk Rekod')).toBeLessThan(postSave.indexOf('Tambah Aktiviti'));
    expect(postSave).toContain('ng-post-save__action--primary');
    expect(postSave).toContain('ng-post-save__action--secondary');
    expect(postSave).toContain('<strong className="ng-post-save__title">Disimpan</strong>');
    expect(seal).toContain('--ng-f45-success: #3fb950;');
    expect(seal).toContain('bottom: calc(4.45rem + env(safe-area-inset-bottom)) !important;');
  });

  it('protects medium density and phone tactile targets', () => {
    expect(seal).toContain('grid-template-columns: .78fr .72fr .72fr 1.58fr !important;');
    expect(seal).toContain('@media (max-width: 767px)');
    expect(seal).toContain('min-height: 2.75rem !important;');
  });

  it('does not claim REKOD, print, approval, domain or brand geometry authority', () => {
    expect(seal).not.toMatch(/ngamsoi-mark|DiaryManagementList|DiaryDetail|print_context|approvalRepository|supabase|migration/);
  });
});

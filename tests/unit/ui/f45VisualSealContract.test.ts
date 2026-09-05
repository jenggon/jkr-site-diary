import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
const authority = source('src/app/ngamsoi-f45-authority.css');
const postPhysical = source('src/app/ngamsoi-f45-post-physical.css');
const smartWorkforce = source('src/app/site-diary/SmartWorkforceEntry.tsx');
const observer = source('src/app/site-diary/F45SpineGeometryObserver.tsx');
const postSave = source('src/app/site-diary/PostSaveConfirmation.tsx');

describe('F4.5 physical visual seal contract', () => {
  it('forces sharp operational surfaces while preserving only semantic circular exceptions', () => {
    expect(authority).toContain('--ng-f45-radius: 0;');
    expect(authority).toContain('--ng-f45-radius-small: 0;');
    expect(authority).toContain(".ngamsoi-shell [class*='rounded']");
    expect(authority).toContain('border-radius: 0 !important;');
    expect(authority).toContain('.ng-profile-trigger');
    expect(authority).toContain('border-radius: 999px !important;');
    expect(authority).toContain("form[aria-label='Borang Buku Harian Tapak'] > .ng-entry-step[data-entry-step]::before");
    expect(authority).toContain('border-radius: 50% !important;');
    expect(postPhysical).toContain('.ng-post-save__check');
    expect(postPhysical).toContain('border-radius: 0 !important;');
  });

  it('uses measured semantic Spine geometry while preserving explicit state authority', () => {
    expect(observer).toContain("step.style.setProperty('--ng-spine-node-y'");
    expect(observer).toContain("form.style.setProperty('--ng-spine-rail-top'");
    expect(observer).toContain("form.style.setProperty('--ng-spine-rail-height'");
    expect(postPhysical).toContain("[data-spine-geometry='measured']::before");
    expect(postPhysical).toContain('top: calc(var(--ng-spine-node-y) - .38rem) !important;');
    expect(postPhysical).toContain('height: var(--ng-spine-rail-height) !important;');
    expect(authority).toContain("[data-spine-state='complete']::before");
    expect(authority).toContain("var(--ng-f45-success, #3fb950)");
  });

  it('restores the workforce hardhat glyph without re-enabling the hidden legacy header', () => {
    expect(smartWorkforce).toContain('function WorkforceHardhatIcon()');
    expect(smartWorkforce).toContain('className="ng-workforce__overall-icon"');
    expect(smartWorkforce).toContain('<WorkforceHardhatIcon />');
    expect(smartWorkforce).toContain('<F45SpineGeometryObserver />');
    expect(smartWorkforce).not.toContain('◒');
  });

  it('keeps completion focused, persistent, sharp and action-oriented', () => {
    expect(postSave.indexOf('Tunjuk Rekod')).toBeLessThan(postSave.indexOf('Tambah Aktiviti'));
    expect(postSave).toContain('ng-post-save__action--primary');
    expect(postSave).toContain('ng-post-save__action--secondary');
    expect(postSave).toContain('ng-vo-dialog ng-post-save');
    expect(postSave).toContain('role="dialog"');
    expect(postSave).toContain('aria-modal="true"');
    expect(postSave).toContain('data-spine-state="complete"');
    expect(postSave).toContain('<strong');
    expect(postPhysical).toContain('--ng-layer-toast');
    expect(postPhysical).toContain('form[data-ui-authority=\'F45\'] > .ng-post-save-backdrop');
  });

  it('locks Tactical Pulse responsive density and secondary weather placement', () => {
    expect(postPhysical).toContain("grid-template-columns: .78fr .72fr .72fr minmax(13.5rem, 1.62fr) minmax(9rem, .82fr) !important;");
    expect(postPhysical).toContain('@media (min-width: 768px) and (max-width: 1199px)');
    expect(postPhysical).toContain('@media (max-width: 767px)');
    expect(postPhysical).toContain('grid-template-columns: repeat(6, minmax(0, 1fr)) !important;');
    expect(postPhysical).toContain("grid-column: 1 / -1 !important;");
    expect(postPhysical).not.toMatch(/\.ng-project-weather[^\{]*\{[^\}]*display:\s*none\s*!important/s);
  });

  it('does not claim REKOD, print, approval, domain or brand geometry authority', () => {
    expect(postPhysical).not.toMatch(/ngamsoi-mark|DiaryManagementList|DiaryDetail|print_context|approvalRepository|supabase|migration/);
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

type PackageManifest = {
  packageManager?: string;
  scripts?: Record<string, string>;
};

const root = process.cwd();
const packageJson = JSON.parse(
  readFileSync(join(root, 'package.json'), 'utf8'),
) as PackageManifest;
const ciWorkflow = readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8');
const requiredVerify =
  'pnpm run lockset:verify && pnpm run typecheck && pnpm run typecheck:api && pnpm run lint && pnpm run test && pnpm run build';
const dependencyMutationCommand =
  /(?:^|&&|\|\||;|\n)\s*(?:pnpm|npm|yarn)\s+(?:install|add|remove|update|fetch|prune|rebuild)\b/i;

describe('CI-HARDEN-002 non-mutating verification contract', () => {
  it('pins the repository package manager exactly', () => {
    expect(packageJson.packageManager).toBe('pnpm@9.15.4');
  });

  it('defines the exact non-mutating local verification chain', () => {
    const verify = packageJson.scripts?.verify;

    expect(verify).toBe(requiredVerify);
    expect(verify).not.toMatch(dependencyMutationCommand);
    expect(packageJson.scripts).not.toHaveProperty('verify:lockfile');
  });

  it('keeps one authoritative frozen install before one CI verification run', () => {
    expect(ciWorkflow).toMatch(
      /uses:\s*pnpm\/action-setup@v3\s+with:\s+version:\s*9\.15\.4(?:\s|$)/,
    );

    const frozenInstalls = [
      ...ciWorkflow.matchAll(/^\s*run:\s*pnpm install --frozen-lockfile\s*$/gm),
    ];
    const verificationRuns = [
      ...ciWorkflow.matchAll(/^\s*run:\s*pnpm run verify\s*$/gm),
    ];

    expect(frozenInstalls).toHaveLength(1);
    expect(verificationRuns).toHaveLength(1);
    expect(ciWorkflow.indexOf('run: pnpm install --frozen-lockfile')).toBeLessThan(
      ciWorkflow.indexOf('run: pnpm run verify'),
    );
  });
});

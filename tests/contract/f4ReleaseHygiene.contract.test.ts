import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('F4 release hygiene contract', () => {
  it('keeps container dependency installation deterministic', () => {
    const dockerfile = read('Dockerfile');

    expect(dockerfile).toContain('COPY package.json pnpm-lock.yaml .npmrc ./');
    expect(dockerfile).toContain('RUN pnpm install --frozen-lockfile');
    expect(dockerfile).not.toMatch(/pnpm install --frozen-lockfile\s*\|\|/);
    expect(dockerfile).not.toContain('pnpm-lock.yaml*');
    expect(dockerfile.match(/FROM node:22-alpine/g)).toHaveLength(3);
  });

  it('keeps public build configuration explicit and service credentials runtime-only', () => {
    const dockerfile = read('Dockerfile');
    const compose = read('docker-compose.yml');

    expect(dockerfile).toContain('ARG NEXT_PUBLIC_SUPABASE_URL');
    expect(dockerfile).toContain('ARG NEXT_PUBLIC_SUPABASE_ANON_KEY');
    expect(dockerfile).not.toContain('ARG SUPABASE_SERVICE_ROLE_KEY');
    expect(compose).toMatch(/build:[\s\S]*args:[\s\S]*NEXT_PUBLIC_SUPABASE_URL/);
    expect(compose).toMatch(/build:[\s\S]*args:[\s\S]*NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it('excludes local state and host dependencies from the Docker context', () => {
    const dockerignore = read('.dockerignore');

    for (const entry of ['.git', '.next', 'node_modules', '.env.*', 'samples', 'supabase/.temp']) {
      expect(dockerignore.split(/\r?\n/)).toContain(entry);
    }
  });

  it('uses pnpm as the sole dependency lock authority', () => {
    expect(fs.existsSync(path.join(root, 'pnpm-lock.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'package-lock.json'))).toBe(false);
  });

  it('does not restore proven obsolete implementation residue', () => {
    const removedPaths = [
      'samples/fptv-upsi-rev00.xml',
      'scratch/query_msp_tasks.js',
      'scripts/import-msp.ts',
      'src/lib/mspHierarchy.ts',
      'src/repositories/legacyActivityRepository.ts.obsolete',
      'src/services/legacyActivityService.ts.obsolete',
      'src/services/mspParser.ts',
      'src/services/evaluators/RuleEvaluatorRegistry.ts',
    ];

    for (const removedPath of removedPaths) {
      expect(fs.existsSync(path.join(root, removedPath)), removedPath).toBe(false);
    }
  });
});

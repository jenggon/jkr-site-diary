import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('F4.5-B01A styling pipeline contract', () => {
  it('pins the Tailwind 3 PostCSS toolchain under pnpm authority', () => {
    const packageJson = JSON.parse(read('package.json')) as {
      devDependencies?: Record<string, string>;
    };

    expect(packageJson.devDependencies).toMatchObject({
      autoprefixer: '10.4.20',
      postcss: '8.4.31',
      tailwindcss: '3.4.17',
    });
    expect(fs.existsSync(path.join(root, 'pnpm-lock.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'package-lock.json'))).toBe(false);
  });

  it('runs Tailwind and Autoprefixer through PostCSS', () => {
    const postcss = read('postcss.config.mjs');

    expect(postcss).toContain('tailwindcss: {}');
    expect(postcss).toContain('autoprefixer: {}');
  });

  it('scans the complete src tree and preserves compatibility shades', () => {
    const tailwind = read('tailwind.config.cjs');

    expect(tailwind).toContain("content: ['./src/**/*.{js,ts,jsx,tsx,mdx}']");
    expect(tailwind).toContain("650: '#49494f'");
    expect(tailwind).toContain("850: '#202023'");
  });

  it('loads Preflight, components, and utilities through the root global stylesheet', () => {
    const globals = read('src/app/globals.css');
    const layout = read('src/app/layout.tsx');

    expect(globals).toMatch(/^@tailwind base;\r?\n@tailwind components;\r?\n@tailwind utilities;/);
    expect(layout).toContain('import "./globals.css"');
  });
});

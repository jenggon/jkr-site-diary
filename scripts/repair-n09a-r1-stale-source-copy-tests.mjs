import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';

function replaceExact(path, before, after, label) {
  const source = readFileSync(path, 'utf8');
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${label}: expected block not found in ${path}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`${label}: expected block is not unique in ${path}`);
  }
  writeFileSync(path, source.replace(before, after));
}

replaceExact(
  'tests/unit/ui/operationalSourceSelector.test.ts',
  `    expect(html).toContain('MSP');\n    expect(html).toContain('VO');\n    expect(html).toContain('Sumber');`,
  `    expect(html).toContain('Skop Kontrak');\n    expect(html).toContain('Perubahan Skop (VO)');\n    expect(html).toContain('Sumber');`,
  'operational-source-tabs-copy',
);

replaceExact(
  'tests/unit/ui/operationalSourceSelector.test.ts',
  `    expect(html).toContain('Kerja-kerja Struktur Bawah (Substructure)');\n    expect(html).toContain('MSP');\n    expect(html).toContain('WBS: 1.1.2');`,
  `    expect(html).toContain('Kerja-kerja Struktur Bawah (Substructure)');\n    expect(html).toContain('Skop Kontrak');\n    expect(html).toContain('WBS: 1.1.2');`,
  'operational-source-selected-msp-copy',
);

replaceExact(
  'tests/integration/ui/dailyEntryNavigationFlow.test.ts',
  `    // Should render selected source summary\n    expect(html).toContain('MSP');\n    expect(html).toContain('Kerja Asas Bangunan (Footing)');`,
  `    // Should render selected source summary using the locked field-language copy.\n    expect(html).toContain('Skop Kontrak');\n    expect(html).toContain('Kerja Asas Bangunan (Footing)');`,
  'daily-entry-selected-source-copy',
);

replaceExact(
  'tests/integration/ui/openActivitiesUi.test.ts',
  `    expect(html).toContain('MSP');\n    expect(html).toContain('VO');\n    expect(html).toContain('Harian');\n    expect(html).toContain('Pekerja');`,
  `    expect(html).toContain('Skop Kontrak');\n    expect(html).toContain('Perubahan Skop (VO)');\n    expect(html).toContain('Harian');\n    expect(html).toContain('Pekerja');`,
  'open-activities-baharu-source-copy',
);

replaceExact(
  'tests/integration/ui/openActivitiesUi.test.ts',
  `    expect(html).toContain('MSP');\n    expect(html).toContain('VO');\n  });\n\n  // 25. Completed Activity disappears after canonical re-fetch`,
  `    expect(html).toContain('Skop Kontrak');\n    expect(html).toContain('Perubahan Skop (VO)');\n  });\n\n  // 25. Completed Activity disappears after canonical re-fetch`,
  'open-activities-xor-render-copy',
);

// Preserve internal semantic assertions (sourceType MSP | VO) elsewhere in the suites.
unlinkSync('scripts/repair-n09a-r1-stale-source-copy-tests.mjs');
unlinkSync('.github/workflows/n09a-r1-stale-source-copy-test-repair.yml');
console.log('N09A R1 stale source-copy test expectations repaired; one-shot tooling removed.');

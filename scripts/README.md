# Repository scripts

The mandatory engineering gate is `pnpm run verify`; scripts in this directory do not replace it.

- `project-audit.ps1` and `checks/` are the retained Windows/PowerShell blueprint-audit utility.
- `c01-live-security-proof.cjs`, `c04-live-security-proof.cjs`, `c05-live-security-proof.cjs`, and
  `live-db-test.cjs` are local Supabase proof utilities. Run them only against the documented local
  environment and never against production.
- Generated audit logs belong in `scripts/artifacts/` and are ignored by Git.
- `reports/` contains retained historical audit evidence; do not treat it as current CI output.

The obsolete direct MSP import prototype was removed in F4. Canonical MSP ingestion is exposed by
the application route and `MspIngestionService`.

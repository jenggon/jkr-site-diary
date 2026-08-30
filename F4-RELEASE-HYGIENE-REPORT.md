# F4 — Release Hygiene Report

## 1. Scope and exact lineage

- Repository: `jenggon/jkr-site-diary`
- Base branch: `develop`
- Exact authoritative base SHA: `b2277db37c75d386a2e2be7c2ac6f6bc7e37650c`
- Feature branch: `chore/F4-release-hygiene`
- Exact feature remediation HEAD SHA: `4a09148bf4d3ef77ef0c913718b02238eae321e4`
- Remediation commits:
  - `4dc0766fadec30e0477950bf91ba1d44c4a48af1` — deterministic container portability
  - `4a09148bf4d3ef77ef0c913718b02238eae321e4` — proven obsolete repository residue

The remediation HEAD is the exact implementation state verified before this report was added. The
report is committed separately so the implementation SHA remains an immutable, non-self-referential
evidence point. The PR records the final documentation-inclusive branch tip.

F4 changed repository, build, portability, and release hygiene only. It introduced no feature,
architecture, database, security, business-rule, or UI/UX redesign.

## 2. F4 Release Hygiene Findings Matrix

| ID | Area | Finding | Evidence | Risk | Proposed Action | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| F4-R01 | Container | Docker allowed a mutable install fallback and optional lockfile | `pnpm install --frozen-lockfile \|\| pnpm install`; wildcard lockfile copy | Non-reproducible image | Require exact lockfile/config and frozen install only | F4-BLOCKER |
| F4-R02 | Container | Docker build had no context exclusions | `.dockerignore` absent; local `.env.local`, `.git`, `.next`, `node_modules`, tests, and artifacts existed | Secret/context leakage and host dependency overwrite | Add bounded `.dockerignore` | F4-BLOCKER |
| F4-R03 | Container | Next public Supabase values were provided only at runtime | Compose runtime environment; no Docker build arguments | Standalone client could compile missing/placeholder configuration | Add explicit public build args; keep service-role key runtime-only | F4-BLOCKER |
| F4-R04 | Container | Lockfile configuration was missing inside the dependency stage | First hardened image build failed `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`; `.npmrc` defines `auto-install-peers=false` | Frozen image install could not reproduce CI | Copy `.npmrc` with dependency manifests | F4-BLOCKER |
| F4-R05 | Toolchain | CI used Node 22 while Docker used Node 20 and local expectations were undocumented | CI workflow, Docker stages, no version file | Environment drift | Standardize Docker/dev guidance on Node 22 and add `.nvmrc` | F4-HYGIENE |
| F4-R06 | Lockfiles | A stale npm lockfile coexisted with canonical pnpm state | `package-lock.json` dated from the initial commit and listed obsolete/missing packages; `packageManager` is pnpm 9.15.4 | Wrong installer could resolve a different app | Remove stale npm lockfile | F4-HYGIENE |
| F4-R07 | Repository | A 95,336,749-byte MSP XML fixture was tracked although its test skips when absent and synthetic coverage exists | `samples/fptv-upsi-rev00.xml`; guarded fixture test | Heavy checkout and container context | Remove and ignore local XML fixtures | F4-HYGIENE |
| F4-R08 | Repository | Twenty-one one-off root rewrite scripts had no references | Repository-wide scan returned zero references for every `fix*.py/cjs` file | Root clutter and accidental rerun | Delete scripts | F4-HYGIENE |
| F4-R09 | Source | Incomplete scratch query and explicitly obsolete Activity files were unreachable | `scratch/query_msp_tasks.js`, `*.obsolete`, no imports | Misleading duplicate paths | Delete files | F4-HYGIENE |
| F4-R10 | Source | Legacy MSP parser/import paths were superseded | No imports of `mspParser.ts`; AUDIT-012 identifies `scripts/import-msp.ts` as deprecated; production uses `MspIngestionService` | Duplicate unsafe ingestion path | Delete legacy files and stale tsconfig exclusions | F4-HYGIENE |
| F4-R11 | Source | Old rule-evaluator path and `mspHierarchy.ts` had no composition root, imports, or tests | Repository-wide reference scan | Dead production code obscured canonical engines | Delete unreachable non-UI modules | F4-HYGIENE |
| F4-R12 | UI | `BottomNavigation.tsx` and `SearchPicker.tsx` are unreferenced | Their definitions are their only references | Dead UI code, but not release-blocking | Leave for F4.5 review | F4.5-UI |
| F4-R13 | Generated files | Seven tracked audit `.log` files were zero-byte placeholders | File-size and tracked-path scan | Dirty generated-file convention | Remove and ignore generated logs; retain historical reports | F4-HYGIENE |
| F4-R14 | Local artifacts | `supabase/snippets/` was untracked and not ignored | Pre-existing `Untitled query 865.sql` | Recurring accidental local artifact | Ignore directory without deleting user-owned file | F4-HYGIENE |
| F4-R15 | Hooks | Husky pre-commit was tracked as mode `100644` | Git index mode | Hook may not execute on Unix | Mark executable without changing checks | F4-HYGIENE |
| F4-R16 | Docs | README repeated superseded Site Diary ownership and stale CI/tooling detail | README conflicted with AGENTS/REM-007/DB-014/DB-015 | RC onboarding could contradict sealed architecture | Reconcile to current authorities and commands | F4-HYGIENE |
| F4-R17 | Dependencies | Several dev packages have no direct imports, but remain documented toolchain/transitive support | Package/import/config scan | Removal would cause lock churn without proven RC value | Retain pending dedicated dependency review | DEFER |
| F4-R18 | Deployment | Compose retains a PostgreSQL service/DATABASE_URL not used by the Supabase-backed application | Environment-variable usage scan | Final deployment topology is ambiguous | Classify during F5 deployment planning | F5-RELEASE |
| F4-R19 | Evidence | Historical closure/audit documents, generated `latest` reports, `baseline.sql`, and tracked `next-env.d.ts` can look old/generated | Governance history and verification ordering | Deletion could damage auditability or clean-checkout typecheck | Retain intentionally | KEEP |
| F4-R20 | CI/build | CI pins pnpm 9.15.4, performs one frozen install, then one non-mutating verify; no tracked build output or case collision was found | Workflow, contract tests, tracked-path and case scan | None | NO REMEDIATION REQUIRED | KEEP |

## 3. Bounded remediation performed

### F4-B01 — Deterministic portable container

- Changed all Docker stages from Node 20 Alpine to Node 22 Alpine, matching CI.
- Added `.nvmrc` with Node 22 for developer alignment.
- Made `pnpm-lock.yaml` and `.npmrc` mandatory dependency-stage inputs.
- Removed the mutable install fallback; the image now runs only
  `pnpm install --frozen-lockfile`.
- Added required build arguments for `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Kept `SUPABASE_SERVICE_ROLE_KEY` out of Docker build arguments and layers.
- Forwarded only the public arguments through Compose build configuration.
- Removed the obsolete Compose `version` key.
- Added `.dockerignore` coverage for Git state, environment files, host dependencies, build/test
  output, local Supabase state, scratch data, and large local samples.

### F4-B02 — Proven repository residue removal

- Removed the stale npm lockfile, leaving `pnpm-lock.yaml` as the sole dependency authority.
- Removed the optional 95 MB local MSP XML fixture and ignored local sample XML files.
- Removed twenty-one unreferenced root rewrite scripts.
- Removed the incomplete scratch query, explicitly obsolete Activity files, zero-byte audit logs,
  and an unnecessary `.gitkeep`.
- Ignored local Supabase snippets while preserving the pre-existing user-owned snippet on disk.
- Marked `.husky/pre-commit` executable in the Git index.

### F4-B03 — Proven unreachable non-UI paths

- Removed the deprecated direct MSP import prototype and legacy `mspParser.ts`.
- Removed the unreferenced `mspHierarchy.ts` helper.
- Removed the unused generic rule-evaluator path that had no composition root or consumers.
- Removed two test-only debug `console.log` statements.
- Added `tests/contract/f4ReleaseHygiene.contract.test.ts` to prevent restoration of mutable Docker
  install behavior, missing build configuration, leaked Docker context, multiple lock authorities,
  or specified obsolete paths.

### F4-B04 — Documentation reconciliation

- Rewrote the README to reflect the sealed REM-007 / DB-014 / DB-015 ownership model, official
  output contract, exact package manager, Node expectation, non-mutating verification contract,
  and correct standalone image configuration.
- Populated `scripts/README.md` so optional audit and local proof utilities are not confused with
  the mandatory CI gate.

## 4. Intentionally retained items

- All historical governance, architecture, audit, remediation, acceptance, and closure documents.
- `baseline.sql` and retained historical audit reports under `scripts/reports/`.
- The Windows/PowerShell blueprint audit framework and local F2.7/F3 security proof utilities.
- `next-env.d.ts`, because the current verification sequence typechecks before invoking Next build.
- Existing dependencies and devDependencies; F4 made no package or lockfile-content change.
- Production error logging and test logs that are assertion evidence rather than abandoned debug
  statements.
- The existing locked print renderer and its known non-blocking `<img>` lint warning.

## 5. Deferred F4.5 items

- Review of the unreferenced `BottomNavigation.tsx` and `SearchPicker.tsx` UI components.
- Any navigation, component, responsive-layout, visual hierarchy, theme, or form redesign.
- The locked print renderer `<img>` warning if a visual/print-safe replacement is approved.

No UI file was changed in F4.

## 6. Deferred F5 items

- Selection and approval of the production/RC deployment topology.
- Reconciliation of the retained Compose PostgreSQL service with the Supabase production boundary.
- Production environment and secret injection, registry/release tagging, UAT, and deployment.
- GitHub exact-head CI remains the authoritative remote gate after the PR is pushed.

F4 performed no deployment.

## 7. Architecture, security, and product-output confirmation

- F0-F3 semantics were not reopened.
- Programme/Revision, Activity, Site Diary, MSP XOR VO, Workforce, Progress, Approval, RBAC/RLS,
  canonical actor authority, print business semantics, and Supabase trust boundaries were not
  changed.
- No migration, SQL policy, RPC, API route, repository used by production, service used by
  production, or UI page/component implementation was changed.
- The official Site Diary output contract was untouched: JKR Site Diary Page 1 remains the primary
  output with continuation/extension pages only when required.
- F3 security was not weakened.

## 8. Verification evidence

### Mandatory local gate

Command:

```text
pnpm run verify
```

Result: **PASS**

| Gate | Result |
| --- | --- |
| Standard TypeScript validation | PASS |
| API-inclusive TypeScript validation | PASS |
| ESLint | PASS — 0 errors, 1 retained non-blocking print warning |
| Full automated test suite | PASS — 137 files, 1,125 tests |
| Production Next.js build | PASS — 29 static pages generated; standalone-capable build complete |

The local `verify` command remained non-mutating and `pnpm-lock.yaml` was unchanged.

### F4 contract evidence

```text
pnpm run test:contract -- tests/contract/f4ReleaseHygiene.contract.test.ts
```

Result: **PASS** — 22 contract files, 286 assertions, including 5 F4 release-hygiene assertions.

### Container evidence

```text
docker compose --env-file .env.local config --quiet
docker compose --env-file .env.local build app
```

Result: **PASS**

- Compose model validated without the obsolete-version warning.
- Docker used Node 22 Alpine.
- Context exclusions were applied.
- `pnpm install --frozen-lockfile` accepted the committed lockfile and `.npmrc` exactly.
- Next.js compiled, type/lint validation ran, 29 static pages generated, and standalone output was
  copied into the non-root runtime image.
- Image `jkr-sitediary-app:latest` was built locally; it was not pushed or deployed.

### Whitespace and worktree evidence

```text
git diff --check
```

Result: **PASS** — no whitespace errors.

Verification did not create a tracked diff. The pre-existing Supabase snippet remained ignored,
untracked, and untouched.

## 9. Remaining release-hygiene blockers

**F4 release-hygiene blockers remaining: 0.**

F4.5 UI review and F5 deployment decisions are explicit future-phase work and are not silently
converted into F4 blockers.

## 10. Final F4 classification

**F4 IMPLEMENTATION COMPLETE — READY FOR HQ REVIEW, NOT MERGED**

The repository is materially cleaner and the standalone image path is deterministic and portable,
while the sealed F3 product behavior and official Site Diary output remain unchanged.

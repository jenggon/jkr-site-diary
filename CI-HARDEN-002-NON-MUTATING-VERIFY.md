# CI-HARDEN-002 — Non-Mutating Local Verification Contract

## Root cause

The former local verification contract invoked `pnpm install --frozen-lockfile --lockfile-only --ignore-scripts` through `verify:lockfile`. Despite the verification name, that command performs dependency resolution and reconciliation. During F2.7 Final Closure, the child process consumed more than 4 GB of memory for more than 20 minutes before HQ terminated it.

## Previous unsafe contract

`pnpm run verify:lockfile && pnpm run typecheck && pnpm run typecheck:api && pnpm run lint && pnpm run test && pnpm run build`

The removed `verify:lockfile` script was:

`pnpm install --frozen-lockfile --lockfile-only --ignore-scripts`

## New local verification contract

`pnpm run typecheck && pnpm run typecheck:api && pnpm run lint && pnpm run test && pnpm run build`

The local `verify` script now contains only non-mutating engineering checks. It does not install, add, remove, update, fetch, prune, or rebuild dependencies.

## CI dependency ownership

GitHub CI owns dependency installation and frozen-lockfile enforcement. Its single authoritative dependency gate remains `pnpm install --frozen-lockfile`, and it runs before `pnpm run verify`. No second install was added.

CI uses the repository's exact pnpm version: `9.15.4`.

## Regression guard

`tests/contract/verificationContract.contract.test.ts` proves that:

- `packageManager` is exactly `pnpm@9.15.4`;
- `verify` is the required typecheck, API typecheck, lint, test, and build chain;
- `verify` contains no dependency-mutating command;
- `verify:lockfile` is absent;
- CI pins pnpm exactly to `9.15.4`; and
- CI contains exactly one `pnpm install --frozen-lockfile` before exactly one `pnpm run verify`.

## Local dependency safety

No local dependency installation, reconciliation, relinking, rebuild, or `node_modules` repair was performed for this remediation.

## Exact changed files

- `package.json`
- `.github/workflows/ci.yml`
- `tests/contract/verificationContract.contract.test.ts`
- `CI-HARDEN-002-NON-MUTATING-VERIFY.md`

`pnpm-lock.yaml` was not modified. No product source file was modified.

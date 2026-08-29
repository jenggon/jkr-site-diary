# CI-HARDEN-001 — Pre-Push Verification & Green Develop Policy

**Status:** ENFORCED FROM F0 ONWARD

## Contract

Before implementation work is considered complete or ready to push, run:

```bash
pnpm run verify
```

The command must validate:

1. frozen lockfile consistency;
2. standard TypeScript typecheck;
3. API-inclusive TypeScript typecheck;
4. lint;
5. full automated test suite;
6. production build.

A failing verification means the change is not push-ready.

## Dependency Rule

Changes to dependencies/devDependencies in `package.json` must include the corresponding synchronized `pnpm-lock.yaml` in the same change. CI must retain frozen-lockfile behavior; `--no-frozen-lockfile` is not an accepted workaround.

## Branch / PR Rule

Implementation changes use feature/fix/chore branches and enter `develop` through Pull Requests. CI must be green before merge. Direct implementation pushes to `develop` are prohibited for agents.

## Green Baseline Policy

`develop` is the always-green forward-development baseline. `main` receives only accepted green release states.

## Scope Guard

CI-HARDEN-001 is engineering governance only. It does not authorize architecture, business-rule, Site Diary output, or domain-semantics changes.

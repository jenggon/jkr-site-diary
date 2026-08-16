# F0 — Baseline Stabilization Report

## Scope

F0 stabilizes the sealed post-A27 architecture without changing business semantics, Site Diary output requirements, or domain ownership.

## Implemented

- Fixed `PATCH /api/activity/[activityId]` to use one verified identity object for both authenticated service construction and `updatedBy` actor propagation.
- Added API-inclusive TypeScript configuration via `tsconfig.api.json`.
- Added `typecheck:api`, `verify:lockfile`, and unified `pnpm run verify` scripts.
- Updated GitHub CI to run frozen dependency installation and the same unified verification contract.
- Added execution-level Activity PATCH identity test.
- Added CI-HARDEN-001 no-push/no-merge governance to `AGENTS.md`.
- Added REM-007 HQ acceptance / closure reconciliation record while preserving the historical specification chronology.

## Explicit Non-Changes

F0 does not:

- reopen A01–A27 architecture decisions;
- alter Activity / Site Diary canonical ownership;
- alter Programme Revision semantics;
- alter carry-forward business semantics;
- redesign Site Diary output;
- change the locked requirement that the final printable output remains Site Diary Page 1 with extension page(s) only when required by the established specification.

## Exit Gate

F0 is complete only when the Pull Request CI is green under the unified verification contract and the merged `develop` baseline remains green.

GitHub branch protection / required-check settings are repository-host controls and must be enabled for `develop` so the `validate` CI check is required before merge. Agent governance already prohibits direct implementation pushes to `develop`.

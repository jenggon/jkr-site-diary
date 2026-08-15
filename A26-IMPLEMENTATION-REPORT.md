# A26 Target Canonicalization Implementation Report

Date: 2026-08-15

## Scope delivered

A26 Option A (Target Canonicalization) is implemented. The four orphan routes were deleted rather than replaced by stubs, and the four active read routes now delegate to a narrowly scoped query service. No frontend call site was changed.

## Files deleted

- `src/app/api/resources/route.ts`
- `src/app/api/trades/route.ts`
- `src/app/api/buildings/route.ts`
- `src/app/api/previous-activities/route.ts`

## Files added

- `src/repositories/IA26ReadRepository.ts`
- `src/repositories/A26ReadRepository.ts`
- `src/services/A26QueryService.ts`
- `tests/unit/services/A26QueryService.test.ts`
- `tests/unit/api/a26Architecture.test.ts`
- `A26-IMPLEMENTATION-REPORT.md`

## Files modified

- `src/app/api/ahi/route.ts`
- `src/app/api/workpackages/route.ts`
- `src/app/api/project-summary/route.ts`
- `src/app/api/reports/route.ts`

## Query abstractions

`IA26ReadRepository` is the persistence boundary for the four projections. `A26ReadRepository` contains the Supabase infrastructure and canonical table query details for `programme`, `task`, `site_diary`, and `activity`. `A26QueryService` owns only the read-model projections and is dependency-injectable for focused tests.

Existing domain services were not modified because UI picker, project-header, and daily-report projections do not naturally belong to the A17–A25 command/domain services. Canonical Task, Activity, and Site Diary types were reused. Task reads resolve `programme.current_revision_id` before reading `task`, preventing cross-revision operational task projection.

Route handlers import only `a26QueryService`; they do not import Supabase, call `.from(...)`, own table/filter/join logic, or instantiate database infrastructure.

## Response-contract preservation

- AHI preserves `id`, `task_name`, `outline_number`, `display_name`, and `context_name`, including the building-context display label.
- Workpackages preserves the same picker fields and the required `building` validation. It returns only non-summary descendants of the requested building WBS.
- Project Summary preserves `task_name`, `start_date`, `finish_date`, and `revision_id`, now projected from the root task of the current canonical revision.
- Reports preserves the daily-report fields consumed by `site-diary/page.tsx`, including `id`, `site_diary_id`, project/programme identity, Activity AHI/subtask labels, activity date, manpower, notes, submit/update timestamps, weather, and Malay UI status labels. `id` is the canonical `site_diary_id`, preserving the Edit Engine rule.
- The existing default programme ID remains available for callers that do not send `programmeId`. AHI, Workpackages, and Project Summary additionally accept `programmeId` without requiring frontend changes.
- Reports continues to default to the current UTC date and optionally accepts `date`.
- No frontend file was modified because the existing callers already consume these shapes.

## Tests added & remediated

`tests/unit/services/A26QueryService.test.ts` proves:

- AHI projection and building context;
- Workpackages contract and filtering;
- Project Summary current-revision root projection;
- Canonical Site Diary plus Activity mapping to the daily-report contract, enforcing distinct `activityId` (`activityId !== id`);
- Current revision safety: excludes Site Diary reports belonging to superseded revisions and includes current revision reports.

`tests/unit/api/a26Architecture.test.ts` proves:

- each active A26 route delegates to `a26QueryService` and contains no direct Supabase or `.from(...)` access;
- each authorized orphan route file no longer exists.

## Validation results

- `npm run typecheck`: PASS (0 errors)
- `npm run lint`: PASS (0 errors)
- `npm test`: PASS — 59 test files, 317 tests passed (303 from sealed A25 baseline + 14 A26 tests)
- `npm run build`: PASS

Build note: Next.js emitted the pre-existing case-only module-name warning for `src/repositories/ActivityRepository.ts` and `src/repositories/activityRepository.ts`. The build completed successfully. This is outside A26 and was not changed.

## Direct Supabase access search

Command:

```text
rg -n "supabase|\.from\s*\(" src/app/api/ahi/route.ts src/app/api/workpackages/route.ts src/app/api/project-summary/route.ts src/app/api/reports/route.ts
```

Result: no matches.

Deleted-route existence check returned `False` for `resources`, `trades`, `buildings`, and `previous-activities` route files.

## A17–A25 contamination audit

The final changed-path audit contains only:

- the eight explicitly authorized A26 route paths (four deleted and four modified);
- the three new A26 repository/service abstraction files;
- the two new focused A26 test files;
- this implementation report.

No A17 Programme Revision, A19 Open Activities, A20 Site Diary, A21 Intelligence, A22 Progress, A23 Daily Operations, A24 Workforce, or A25 Approval engine file was modified. No schema, migration, frontend, or out-of-scope Activity route was modified.

## Stop condition

No branch, commit, push, pull request, or merge was created. Implementation is stopped for HQ independent verification.

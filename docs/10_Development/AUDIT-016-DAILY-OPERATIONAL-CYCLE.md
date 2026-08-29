# AUDIT-016 — DAILY OPERATIONAL CYCLE

**Project:** JKR Site Diary Digital Platform
**Repository:** `jenggon/jkr-site-diary`
**Branch:** `develop`
**Baseline:** `bbc033a9cdea02e468058f88152204d2b07ce427`
**Date:** 2026-08-09
**Verdict:** 🔴 FAIL (Score: 6.00 / 10.0 | One P1 Finding)

---

## 1. Scope
This audit verifies the locked JKR Site Diary daily operational cycle, focusing on the ability to correctly execute the lifecycle of a daily Site Diary entry across Programme, Revision, and Activity engines.

## 2. Architecture Reviewed
- `SiteDiaryService.ts` and `ISiteDiaryService.ts`
- `siteDiaryRepository.ts`
- Canonical SQL migrations (`baseline.sql`, `20260802231500_activity_engine.sql`, `20260802232900_site_diary_engine.sql`)
- Open Activities Engine mapping (`OpenActivityRepository.ts`)

## 3. Daily Cycle Model
The intended model for the daily cycle is implemented in `SiteDiaryService.ts`. It takes `programmeId`, `revisionId`, `activityId`, and `activityDate` to instantiate a daily operational record with `weather`, `notes`, and `manpower`.

## 4. Revision Binding
Verified intact. `SiteDiaryService.createSiteDiary` enforces revision affinity by querying the `ProgrammeRevisionRepository` and explicitly rejecting operations if the target revision is not `Approved` or not `isCurrent`. (D1 Revision Safety compliance).

## 5. Activity Lifecycle
`SiteDiaryService` binds daily records to a canonical `activityId`. However, the state machine handling for the daily Site Diary entry itself (e.g. Draft -> Submitted -> Approved daily record) is absent from the service layer.

## 6. Continue Yesterday
**Missing.** There is no implementation of the "Continue Yesterday" logic in `SiteDiaryService.ts` or its repository. The system currently only provides standard CRUD methods (`createSiteDiary`, `updateSiteDiary`), but lacks the specific bounded logic to carry forward an uncompleted activity into a new daily record.

## 7. Date Boundary
Implemented via SQL `UNIQUE ("activity_id", "activity_date")` in migration `20260802232900_site_diary_engine.sql` which enforces that only one Site Diary can exist for a specific activity on a specific day. 

## 8. State Machine
**Deficient.** The `SiteDiaryService` allows updating `status` without passing through a dedicated Site Diary State Machine. Open Activity status transitions are handled correctly in `OpenActivityService`, but daily record lifecycles are unmanaged.

## 9. Duplicate / Idempotency
Enforced at the PostgreSQL level via the composite unique constraint `idx_site_diary_activity_id_activity_date`. However, this is absent from the mock in-memory adapters used in the test suite.

## 10. Revision Transition
Correctly respected at the domain boundary. Transitioning a revision to `Superseded` prevents new Site Diaries from being created under that revision. (Verified in `siteDiaryService.test.ts` Phase 3 rules).

## 11. API / Service Boundary
No API route handlers exist specifically for Site Diary daily operations (e.g., `POST /api/site-diaries`). Only Open Activity API endpoints currently exist.

## 12. Data Integrity (CRITICAL P1 ARCHITECTURAL COLLISION)
A catastrophic schema and architectural collision exists on the `site_diary` table:
1. `AGENTS.md` mandates that `site_diary` means "One row represents ONE current activity" (Open Activity).
2. `OpenActivityRepository.ts` writes columns `activity_name`, `is_locked`, `trade_info`, `material_snapshot` to `site_diary` with primary key `id`.
3. `SiteDiaryService.ts` and `siteDiaryRepository.ts` write columns `weather`, `manpower`, `notes` to `site_diary` with primary key `site_diary_id` (representing a Daily Record).
4. `baseline.sql` defines `site_diary` with `id`, while `20260802232900_site_diary_engine.sql` defines `site_diary` with `site_diary_id`.
Both engines are mutating the exact same PostgreSQL table with fundamentally different domain models, primary keys, and column expectations.

## 13. Test Evidence
- **Typecheck:** 🟢 PASSED (0 errors)
- **Lint:** 🟢 PASSED (0 warnings)
- **Test Suite:** 🟢 PASSED (221 / 221 tests) [MOCK EXECUTABLE / CODE EVIDENCE]

*Note: Tests pass only because they use isolated in-memory array mocks that do not enforce the underlying PostgreSQL schema conflicts.*

## 14. Findings
### P1 — Critical Architectural Defects
- **F-01 (P1):** Catastrophic Table Overload on `site_diary`. The `site_diary` PostgreSQL table is simultaneously mapped by the Open Activities Engine (as a stateful Activity record) and the Site Diary Engine (as a daily execution log). Their column definitions, primary keys (`id` vs `site_diary_id`), and domain rules mutually exclude one another.

### P2 — Significant Functional / Compliance Issues
- **F-02 (P2):** Missing "Continue Yesterday" engine. No domain service or API endpoint implements the required daily carry-forward logic for active operations.
- **F-03 (P2):** Missing Site Diary API endpoints. The Daily Operational Cycle cannot be executed via the API because route handlers do not exist.

### P3 — Minor Issues / Hardening
- **F-04 (P3):** Site Diary State Machine is absent. `SiteDiaryService` allows blind updates to the daily record's `status` field without valid transition checks.

### INFO — Observations / Non-Blocking Gaps
- **INFO-01:** CI pipeline currently fails on `ERR_PNPM_OUTDATED_LOCKFILE`, limiting verification to local execution.

## 15. Score
```
Architecture Compliance              0.0 / 2.0  (Deduction: -2.0 for F-01 P1 schema collision)
Implementation Compliance            1.0 / 2.0  (Deduction: -1.0 for missing endpoints/Continue Yesterday)
Business Rule Compliance             1.5 / 2.0  (Deduction: -0.5 for missing state machine)
Test / Verification Evidence         1.0 / 1.5  (Deduction: -0.5 due to CI pipeline limitation)
Security / Integrity                  1.0 / 1.0  (Full score: locked state protection, affinity checks)
Traceability / Documentation          1.0 / 1.0  (Full score: Audit fields present)
Audit Completeness                    0.5 / 0.5  (Full score)
                                      ---------
TOTAL                                 6.00 / 10.0
```

## 16. Verdict
```
🔴 FAIL (Score: 6.00 / 10.0 | One P1 Finding)
```
The architecture currently suffers from a critical data model conflict where two distinct bounded contexts are writing incompatible domain models into a single `site_diary` table.

## 17. Limitations
- `ERR_PNPM_OUTDATED_LOCKFILE` blocks remote GitHub Actions verification.
- Mock repositories mask the underlying PostgreSQL schema conflict during test execution.

## 18. Exit Status
Audit Complete. Pending HQ Remediation Command.

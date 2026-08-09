# D2 AUDIT-008 REMEDIATION REPORT

**Project:** JKR Site Diary Platform  
**Architecture Model:** Option C — Controlled Canonical Program Kerja Model  
**Branch:** `feature/d2-remediation`  
**Date:** 2026-08-09  
**Status:** 🟢 REMEDIATION COMPLETED (Ready for AUDIT-009)

---

## 1. Findings Addressed

| Finding | Severity | Description | Status |
|---------|----------|-------------|--------|
| **F-01** | **P1** | Production composition roots for TRE, WRE, MRE bypassed `ProgramKerjaBoundaryService` by injecting raw MSP repositories directly. | 🟢 **RESOLVED (R1)** |
| **F-02** | **P2** | `IProgramKerjaBoundaryService` method signatures omitted `revisionId`, creating a revision-unsafe boundary interface. | 🟢 **RESOLVED (R2)** |
| **F-03** | **P3** | `Suspended` activity state was omitted from M05 termination handler test. | 🟢 **RESOLVED (R3.A)** |
| **F-04** | **P3** | Missing tests and guard for `Draft`, `Archived`, and `Superseded` revision rejection during activity creation and boundary resolution. | 🟢 **RESOLVED (R3.B / R3.C)** |
| **F-05** | **P3** | `null` `previousRevisionId` scenario in `OpenActivityTerminationHandler` was untested. | 🟢 **RESOLVED (R3.D)** |

---

## 2. R1 — Composition Root Remediation

The production composition roots have been updated to enforce the `ProgramKerjaBoundaryService` operational boundary (ADR-011):

- **[`src/composition/treComposition.ts`](file:///c:/Development/JKR-SiteDiary/src/composition/treComposition.ts):** Instantiates `ProgramKerjaBoundaryService` with `MspResourceRepository` and `ProgrammeRevisionRepository`, and passes it as `programKerjaBoundaryService` to `TreEngineService`.
- **[`src/composition/wreComposition.ts`](file:///c:/Development/JKR-SiteDiary/src/composition/wreComposition.ts):** Instantiates `ProgramKerjaBoundaryService` with `MspWorkforceRepository` and `ProgrammeRevisionRepository`, and passes it as `programKerjaBoundaryService` to `WorkforceEngineService`.
- **[`src/composition/mreComposition.ts`](file:///c:/Development/JKR-SiteDiary/src/composition/mreComposition.ts):** Instantiates `ProgramKerjaBoundaryService` with `MockMspMaterialRepository` and `ProgrammeRevisionRepository`, and passes it as `programKerjaBoundaryService` to `MaterialEngineService`.

**Runtime Chain Enforced:**
```
TRE / WRE / MRE
        ↓
ProgramKerjaBoundaryService
        ↓
MSP repositories / Task Repository
```

---

## 3. R2 — Revision Safety Remediation

- **Boundary Interface ([`src/services/IProgramKerjaBoundaryService.ts`](file:///c:/Development/JKR-SiteDiary/src/services/IProgramKerjaBoundaryService.ts)):** Updated `getProgramKerjaTrade`, `getProgramKerjaWorkforce`, and `getProgramKerjaMaterials` method signatures to accept `(programmeId: string, revisionId: string, taskId: string)`.
- **Boundary Implementation ([`src/services/ProgramKerjaBoundaryService.ts`](file:///c:/Development/JKR-SiteDiary/src/services/ProgramKerjaBoundaryService.ts)):** Implemented `validateContext` to ensure:
  1. `revisionId` is present and non-empty.
  2. Revision is validated against `ProgrammeRevisionRepository` if provided (must be in `Approved` status; `Draft`, `Archived`, and `Superseded` revisions are rejected).
  3. `task.revision_id === revisionId` is enforced (prevents cross-revision task resolution).
  4. `task.programme_id === programmeId` is enforced.
- **Context Types & Engine Propagation:**
  - Extended `TreResolutionContext`, `WorkforceResolutionContext`, and `MaterialResolutionContext` with `revisionId?: string`.
  - Updated `TreEngineService`, `WorkforceEngineService`, and `MaterialEngineService` to pass `ctx.revisionId` to boundary calls.
  - Updated `OpenActivityService` to pass `cmd.revisionId` into engine resolution contexts.
  - Added guards in `OpenActivityService.createActivity` to reject `Draft`, `Archived`, and `Superseded` revisions.

---

## 4. R3 — Test Coverage Expansion

Added comprehensive unit tests in [`tests/unit/d2Remediation.test.ts`](file:///c:/Development/JKR-SiteDiary/tests/unit/d2Remediation.test.ts):

1. **R3.A (Suspended Activity Locking):** Added `Suspended` activity to M05 termination test dataset; verified `isLocked = true` with status remaining `'Suspended'`.
2. **R3.B & R3.C (Draft/Archived Rejection):** Verified `OpenActivityService.createActivity` rejects `Draft`, `Archived`, and `Superseded` revisions.
3. **R3.D (Null Previous Revision ID):** Verified `OpenActivityTerminationHandler.handle()` returns cleanly without invoking activity updates when `previousRevisionId` is `null`.
4. **R2 (Boundary Revision Safety):** Verified `ProgramKerjaBoundaryService.getProgramKerjaTrade()` rejects `Draft` revisions and task/revision mismatches, while resolving `Approved` revisions cleanly.
5. **R1 / R3.E (Composition Root Verification):** Verified `createTreEngineService()`, `createWorkforceEngineService()`, and `createMaterialEngineService()` factory functions instantiate successfully with `ProgramKerjaBoundaryService` wired.

---

## 5. Verification Results

- **Automated Unit & Integration Tests (`npm test`):** 🟢 **42 test files passed, 177 total tests passed**.
- **ESLint (`npm run lint`):** 🟢 **0 errors, 0 warnings**.
- **TypeScript Compiler (`npm run typecheck`):** 🟢 **0 compilation errors** (`tsc --noEmit` exited with code 0).

---

## 6. Files Changed

1. [`src/services/IProgramKerjaBoundaryService.ts`](file:///c:/Development/JKR-SiteDiary/src/services/IProgramKerjaBoundaryService.ts) — Added `revisionId` parameter to boundary contract.
2. [`src/services/ProgramKerjaBoundaryService.ts`](file:///c:/Development/JKR-SiteDiary/src/services/ProgramKerjaBoundaryService.ts) — Added context validation & revision status check.
3. [`src/types/tre.ts`](file:///c:/Development/JKR-SiteDiary/src/types/tre.ts) — Added `revisionId?: string` to `TreResolutionContext`.
4. [`src/types/wre.ts`](file:///c:/Development/JKR-SiteDiary/src/types/wre.ts) — Added `revisionId?: string` to `WorkforceResolutionContext`.
5. [`src/types/mre.ts`](file:///c:/Development/JKR-SiteDiary/src/types/mre.ts) — Added `revisionId?: string` to `MaterialResolutionContext`.
6. [`src/services/TreEngineService.ts`](file:///c:/Development/JKR-SiteDiary/src/services/TreEngineService.ts) — Propagated `ctx.revisionId` to `pkBoundary`.
7. [`src/services/WorkforceEngineService.ts`](file:///c:/Development/JKR-SiteDiary/src/services/WorkforceEngineService.ts) — Propagated `ctx.revisionId` to `pkBoundary`.
8. [`src/services/MaterialEngineService.ts`](file:///c:/Development/JKR-SiteDiary/src/services/MaterialEngineService.ts) — Propagated `ctx.revisionId` to `pkBoundary`.
9. [`src/services/OpenActivityService.ts`](file:///c:/Development/JKR-SiteDiary/src/services/OpenActivityService.ts) — Propagated `cmd.revisionId` to engine contexts & validated revision status.
10. [`src/composition/treComposition.ts`](file:///c:/Development/JKR-SiteDiary/src/composition/treComposition.ts) — Wired `ProgramKerjaBoundaryService`.
11. [`src/composition/wreComposition.ts`](file:///c:/Development/JKR-SiteDiary/src/composition/wreComposition.ts) — Wired `ProgramKerjaBoundaryService`.
12. [`src/composition/mreComposition.ts`](file:///c:/Development/JKR-SiteDiary/src/composition/mreComposition.ts) — Wired `ProgramKerjaBoundaryService`.
13. [`tests/unit/d2Remediation.test.ts`](file:///c:/Development/JKR-SiteDiary/tests/unit/d2Remediation.test.ts) — Added R1, R2, and R3 test coverage.
14. [`docs/10_Development/D2-AUDIT-008-REMEDIATION-REPORT.md`](file:///c:/Development/JKR-SiteDiary/docs/10_Development/D2-AUDIT-008-REMEDIATION-REPORT.md) — Documentation report.

---

## 7. Architecture Preservation

- **Option C Preserved:** Canonical planning chain (`programme` $\rightarrow$ `programme_revision` $\rightarrow$ `task` $\rightarrow$ `activity` $\rightarrow$ `site_diary`) remains intact.
- **ADR-011 Preserved:** `ProgramKerjaBoundaryService` is now active in production composition roots.
- **D2 M01–M08 Preserved:** All baseline D2 requirements remain PASS.
- **Legacy MSP Tables Untouched:** No changes to legacy database schemas.
- **No Overengineering:** No external brokers, XML importers, or extra status fields introduced.

---

## 8. Remaining Issues

None. All AUDIT-008 findings (F-01 through F-05) have been completely remediated and verified. The branch `feature/d2-remediation` is ready for independent verification under **AUDIT-009**.

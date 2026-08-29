# A23 RECONNAISSANCE REPORT
## DAILY OPERATIONS & CARRY-FORWARD

### 1. DAILY ACTIVITY LIFECYCLE
**Implementation Findings:**
- Daily operational state is instantiated by creating a new `SiteDiary` record for a given `activity_id` and `activity_date` (`src/services/siteDiaryService.ts`).
- When an Activity is not explicitly closed (i.e. `status !== ActivityStatus.Completed`), it is rolled forward into the next day via `siteDiaryService.carryForwardActiveOperations()`.
- The state is copied from the previous day's `SiteDiary` (e.g., `manpower: latestDiary?.manpower ?? null`) and linked to the same `Activity` record.

**Status:** IMPLEMENTED (via procedural loop, not a state-machine transition)

### 2. CARRY-FORWARD BEHAVIOUR
**Implementation Findings:**
- **D1 (Recurring/Unfinished):** Implemented. `carryForwardActiveOperations` loops through all active activities in the active revision and clones them.
- **D2 (User-Closed):** Implemented. `filter((a: Activity) => a.status !== ActivityStatus.Completed)` ensures closed activities are excluded.
- **D3 ("Continue/Sambung" logic):** Partially implemented. The newly created `SiteDiary` inherits the `Activity` status. However, authoritative docs specify an explicit `Continue` and `Suspended` state, which do not exist in the code (`ActivityStatus` only contains `New`, `InProgress`, `Completed`).

**Status:** PARTIAL (Missing specific state classifications like `Continue` and `Suspended`)

### 3. SITE DIARY DAILY INTEGRATION
**Implementation Findings:**
- **Date Continuity & Idempotency:** Implemented. `continueYesterday` uses `getSiteDiaryByActivityAndDate` to return the existing diary if one is already created, preventing duplicates.
- **Revision Continuity:** Implemented. Strictly verified (`if (!revision || revision.status !== 'Approved' || !revision.isCurrent) return Failure;`). Cross-revision carry-forward is securely blocked.
- **Superseded Activities:** Prevented from carrying forward by querying only the currently active `revision_id`.

**Status:** EXISTING PASS

### 4. PROGRESS INTERACTION
**Implementation Findings:**
- Carry-forward currently only copies `manpower` and `status` to the new `SiteDiary` record.
- **Progress Carry-Forward:** Completely absent. `DEV-011D` states: "Unfinished progress (<100%) carries forward target quantities to next daily diary," but this is not implemented.
- **100% Completion:** A22 successfully enforces that reaching 100% progress calls `completeActivity`, updating the Activity state to `Completed`. This correctly prevents future carry-forward.

**Status:** PARTIAL / ARCHITECTURE GAP

### 5. DATA INTEGRITY / IDEMPOTENCY
**Implementation Findings:**
- **Concurrency & Duplication:** Prevented by the `getSiteDiaryByActivityAndDate` check inside `continueYesterday`.
- **Orphan Records:** Prevented by strict foreign key validation on `activity_id` and `revision_id`.
- **Stale State:** The system always queries `getLatestSiteDiaryByActivity` to ensure the most recent manpower snapshot is copied.

**Status:** EXISTING PASS

### 6. A17-A22 CONTAMINATION CHECK
**Conflicts Identified:**
- Implementing the missing `Continue` and `Suspended` states requires modifying `ActivityStatus` in `src/types/activity.ts` and adjusting `OpenActivityService` (A19 Boundary).
- Extracting the Carry Forward logic into a dedicated Engine requires refactoring `siteDiaryService.ts` (A20 Boundary).
- Implementing Progress carry-forward requires modifying `progressService.ts` (A22 Boundary).

**Conclusion:** Full strict adherence to the specification for A23 *will* require reopening A19, A20, and A22.

---
### SUMMARY CLASSIFICATION
1. **Idempotency & Revision Integrity:** EXISTING PASS
2. **Missing `Continue` State:** ARCHITECTURE GAP
3. **Carry Forward Engine extraction:** AMBIGUOUS / REQUIRES HQ DECISION
4. **Progress Quantity Carry Forward:** AMBIGUOUS / REQUIRES HQ DECISION

# A23 SPECIFICATION RECONCILIATION

| Specification | Requirement | Actual Implementation | Classification | Evidence |
|---------------|-------------|-----------------------|----------------|----------|
| **DEV-010A** | Carry Forward: Active task continues to next day. Unfinished activity copied to target day. | `siteDiaryService.carryForwardActiveOperations` creates new `SiteDiary` for `targetDate`. | EXISTING PASS | `src/services/siteDiaryService.ts` (Line 303) |
| **DEV-010B** | Open Activities Engine evaluates activities with status `Started`, `Continue`, or `Suspended`. | `ActivityStatus` lacks `Continue` and `Suspended`. System relies on `status !== Completed`. | ARCHITECTURE GAP | `src/types/activity.ts` |
| **DEV-010D** | Carry Forward Engine is a distinct engine triggering Activity Engine state updates. | Handled internally by `siteDiaryService` loops without external events or explicit state updates. | ARCHITECTURE GAP | `src/services/siteDiaryService.ts` (Line 243) |
| **DEV-010D** | Idempotent Evaluation: Multiple runs MUST produce identical results without duplicating rows. | Implemented cleanly. Checks for existing `SiteDiary` before creation. | EXISTING PASS | `siteDiaryService.ts` (Line 273) |
| **DEV-011B** | Activity State Machine transitions: `Not Started` -> `Started` -> `Continue` -> `Completed`. | Only `New`, `InProgress`, and `Completed` exist. Transition to `Continue` is impossible. | ARCHITECTURE GAP | `src/types/activity.ts` |
| **DEV-011D** | Unfinished progress (<100%) carries forward target quantities to next daily diary. | `progressService` does not integrate with carry-forward to copy previous quantities to new diary. | REQUIRES HQ DECISION | `src/services/progressService.ts` / `siteDiaryService.ts` |
| **DEV-011E** | Open Activities Engine prevents `Completed` -> `Active` / `Carry Forward` transition. | Verified. `if (activity.status === ActivityStatus.Completed) return Failure(...)`. | EXISTING PASS | `siteDiaryService.ts` (Line 254) |
| **DEV-010E** | Carry Forward respects Revision transitions and explicitly fails if superseded. | Implemented. Validates `isCurrent` and `status === 'Approved'`. | EXISTING PASS | `siteDiaryService.ts` (Line 265) |

### NOTABLE A17-A22 BOUNDARY CONFLICTS
Fixing the gaps identified above (Adding `Continue` state, extracting a `Carry Forward Engine`, and linking `Progress`) directly conflicts with the HQ order:
**"DO NOT reopen A17/A19/A20/A21/A22."**

HQ must decide whether to accept these architectural gaps as deferred (like the A22 Unit Consistency gap) or authorize reopening the sealed A19/A20/A22 boundaries for full compliance.

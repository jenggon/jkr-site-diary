# REM-004 — Revision Transition Mutation Safety Remediation

**Remediation ID:** REM-004  
**Source Audit:** AUDIT-015 — Programme Revision Transition E2E  
**Source Finding:** F-03 (P2)  
**Branch:** `feature/rem-004-revision-transition-atomicity`  
**Date:** 2026-08-09  
**Status:** IMPLEMENTED — Awaiting HQ Verification

---

## 1. Source Finding

**AUDIT-015 F-03 (P2):**

`OpenActivityTerminationHandler` fires post-commit, outside the `ProgrammeRevision` approval transaction. `OpenActivityService` mutation paths (`startActivity`, `suspendActivity`, `completeActivity`, `cancelActivity`, `updateActivity`) rely solely on the `isLocked` field to block mutations.

**The exposed window:**
```
R1 → Superseded (database transaction commits)
        ↓
OpenActivityTerminationHandler has NOT yet run (isLocked still = false)
        ↓
R1 Open Activity could still be mutated
```

If the process crashes or the handler fails silently in this window, R1 activities remain permanently writable even though R1 is no longer an active revision.

---

## 2. Root Cause

`OpenActivityService.transitionStatusWithLog()` and `updateActivity()` only checked:
1. `activity.isLocked` — set asynchronously by the post-commit event handler.

Neither path verified whether the activity's `revisionId` still refers to an operationally current Programme Revision (`status = 'Approved'` and `isCurrent = true`).

This made the mutation protection dependent on handler timing, violating the locked architectural principle that a superseded revision must **immediately** cease to accept operational mutations.

---

## 3. Existing Architecture

- **`ProgrammeService.approveRevision()`:** Executes an atomic DB transaction to:
  - Set R1 status → `Superseded`
  - Set R2 status → `Approved`
  - Update `programme.currentRevisionId` → R2
- **`ProgrammeRevisionApprovedEvent`:** Published **after** transaction commit.
- **`OpenActivityTerminationHandler`:** Subscribes to the event and sets `isLocked = true` on Planned/InProgress/Suspended R1 activities.
- **`OpenActivityService` mutation paths:** Only check `isLocked`.

The gap: the event handler executes outside the transaction. The service does not verify the revision lifecycle independently.

---

## 4. Remediation Decision

**Strategy: Defence-in-Depth — Layer 2 (Mutation-Time Revision Validity)**

Rather than forcing the event handler into the approval transaction (which would violate engine boundary separation), the remediation adds a **mutation-time revision validity check** at the service layer.

This is architecturally superior because:
- The termination handler remains decoupled from the approval transaction (correct engine boundary).
- The service layer becomes self-sufficient: it does not rely on the handler having completed.
- The two protections are complementary: `isLocked` (Layer 1) and revision lifecycle check (Layer 2).
- The Programme Revision lifecycle remains the sole authority — the activity service reads from it rather than maintaining duplicate state.

**Decision:** No structural change to the event handler or approval transaction. Add `assertRevisionOperational()` private helper to `OpenActivityService`.

---

## 5. Architecture Impact

| Concern | Before | After |
| :--- | :--- | :--- |
| Open Activity mutation protection | `isLocked` only | `isLocked` + revision lifecycle check |
| Protection timing | After post-commit handler executes | Immediately when R1.status = Superseded |
| Engine boundary | Clean | Still clean (service reads revision repo) |
| Handler still needed? | Yes | Yes — `isLocked` provides persistent DB-level protection |
| New authority introduced? | — | No |

---

## 6. Files Changed

| File | Type | Change |
| :--- | :--- | :--- |
| `src/errors/activityErrors.ts` | Modified | Added `ActivityRevisionSupersededError` (HTTP 409) |
| `src/services/OpenActivityService.ts` | Modified | Added `assertRevisionOperational()` helper; wired into `updateActivity` and `transitionStatusWithLog` |
| `src/composition/activityComposition.ts` | Modified | Injected `ProgrammeRevisionRepository` as production dependency |
| `tests/unit/rem004RevisionTransitionSafety.test.ts` | New | 10 REM-004 scenarios including critical failure-window test |

---

## 7. Mutation Paths Protected

All operational mutation paths in `OpenActivityService` now enforce revision validity:

| Method | isLocked check | assertRevisionOperational check | Notes |
| :--- | :--- | :--- | :--- |
| `updateActivity` | ✅ | ✅ | Both checks applied |
| `startActivity` | ✅ (via transitionStatusWithLog) | ✅ | Both checks applied |
| `suspendActivity` | ✅ (via transitionStatusWithLog) | ✅ | Both checks applied |
| `completeActivity` | ✅ (via transitionStatusWithLog) | ✅ | Both checks applied |
| `cancelActivity` | ✅ (via transitionStatusWithLog) | ✅ | Both checks applied |
| `createActivity` | N/A | Already validates revision status pre-create | Pre-existing |

---

## 8. Transaction Boundary

| Operation | Location |
| :--- | :--- |
| R1 → Superseded | Inside approval transaction |
| R2 → Approved | Inside approval transaction |
| `programme.currentRevisionId` → R2 | Inside approval transaction |
| `ProgrammeRevisionApprovedEvent` publish | After transaction commit |
| `OpenActivityTerminationHandler` (isLocked) | After event publish (outside transaction) |
| `assertRevisionOperational()` check | At mutation time (reads DB at call time) |

The key insight: **once the approval transaction commits**, `assertRevisionOperational()` will immediately see R1.status = 'Superseded' and reject any mutation. The event handler executes separately and sets `isLocked` as a persistent, durable lock for future reads.

---

## 9. Tests Added / Updated

**File:** `tests/unit/rem004RevisionTransitionSafety.test.ts`

| Test ID | Description | Result |
| :--- | :--- | :--- |
| TEST-REM004-01 | R1 unlocked + R2 approved → mutation rejected | ✅ PASS |
| TEST-REM004-02 (CRITICAL) | R1 superseded, handler NOT run, isLocked=false → mutation rejected | ✅ PASS |
| TEST-REM004-03 | Already locked → ActivityLockedError (isLocked fires first) | ✅ PASS |
| TEST-REM004-04 | R1 Completed → mutation attempt rejected (revision or state error) | ✅ PASS |
| TEST-REM004-05 | R1 Cancelled → mutation attempt rejected | ✅ PASS |
| TEST-REM004-06 | R2 activity with active R2 revision → mutation allowed | ✅ PASS |
| TEST-REM004-07 | Concurrent mutations on R1 → both rejected | ✅ PASS |
| TEST-REM004-08 | R1 historical records remain queryable | ✅ PASS |
| TEST-REM004-09 | No R1 activity reassigned to R2 | ✅ PASS |
| TEST-REM004-10 | No duplicate generated during transition | ✅ PASS |

---

## 10. Verification Results

```text
npm run typecheck    ✅ PASS (0 errors)
npm run lint         ✅ PASS (0 warnings)
npm test             ✅ PASS (209 / 209 tests passing)
REM-004 tests        ✅ 10 / 10 PASS
```

**Note:** CI pipeline (`ERR_PNPM_OUTDATED_LOCKFILE`) remains a separate open remediation item; local verification is authoritative per AUDIT-014/015 precedent.

---

## 11. Remaining Limitations

1. The `assertRevisionOperational()` check is **advisory only when `revisionRepository` is not injected** (e.g., legacy isolated unit tests). Production code always injects the repo via the composition root.
2. Activities without a `revisionId` (legacy data) skip the check gracefully. No currently identified operational activity lacks a `revisionId`.
3. The post-commit handler (`OpenActivityTerminationHandler`) still runs asynchronously. The durable `isLocked = true` DB flag may not be set immediately on server restart. However, `assertRevisionOperational()` independently enforces the rule on every call, regardless of `isLocked`.

---

## 12. Rollback Considerations

Rollback requires reverting three files:
1. Remove `ActivityRevisionSupersededError` from `src/errors/activityErrors.ts`.
2. Remove `assertRevisionOperational()` and its call sites from `src/services/OpenActivityService.ts`.
3. Remove `ProgrammeRevisionRepository` injection from `src/composition/activityComposition.ts`.

No database migrations required. No breaking API changes.

# DEV-010E — PROGRAMME REVISION TRANSITION WORKFLOW SPECIFICATION
**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-007, ADR-009, ADR-010, DEV-010A, DEV-010B, DEV-010C, DEV-010D  

---

# 1. Purpose Objectives

- **Business Objective:** Support contractual Variation Orders (VO), Arahan Pegawai Penguasa (APK), and Extension of Time (EOT) schedule updates without destroying historical site progress records.
- **Operational Objective:** Seamlessly transition ongoing site activities from an old baseline revision (`Revision N-1`) to a new baseline revision (`Revision N`) while maintaining continuous Carry Forward pools.
- **System Objective:** Enforce strict immutability for published baseline revisions per **ADR-009 (Programme-First Principle)**, guaranteeing historical site diary entries remain permanently linked to their originating baseline snapshot.

---

# 2. Workflow Triggers

1. **Planner Baseline Publish:** Authorized Planner publishes an approved Microsoft Project `.mpp` / XML schedule update in Revision Engine (`is_active` set to `TRUE`).
2. **Contractual Baseline Replacement:** SO issues formal approval for a baseline revision replacement (e.g., EOT approval).
3. **Manual Revision Activation:** Project Director manually sets an approved revision as the active operational baseline.
4. **Emergency Revision Rollback:** Reverting to a prior approved revision due to a rejected or flawed schedule import.

---

# 3. Preconditions Checklist

1. **Existing Baseline:** A valid active revision (`Revision N-1`) exists and governs current site operations.
2. **Imported & Validated MSP Payload:** Target new revision (`Revision N`) has been imported, parsed, and validated by the Task Engine with zero WBS syntax errors or circular dependencies.
3. **Formal Approval:** Target revision possesses an approved `Approval` record signed off by the Superintending Officer.
4. **No Unhandled Conflicts:** WBS task code diff comparison between `Revision N-1` and `Revision N` has completed with zero un-mapped breaking structural changes.

---

# 4. Input & Output Data Structures

### Inputs:
- `programme_id`: Master Programme root ID.
- `old_revision_id`: Currently active `revision_id` (`Revision N-1`).
- `new_revision_id`: Target active `revision_id` (`Revision N`).
- `task`: Task WBS nodes for both revisions.
- `activity`: Operational activities currently linked to `Revision N-1`.
- `site_diary`, `progress`, `approval`: Historical site execution records.

### Outputs:
- Updated `programme_revision` (`new_revision_id.is_active = TRUE`, `old_revision_id.is_active = FALSE`).
- Re-mapped `Activity` entities linked to new task nodes in `Revision N`.
- Re-calculated Open Activities Pool for target daily Site Diaries.
- Audit log entry recording baseline revision transition.

---

# 5. Step-by-Step Execution Workflow Flow

```
[ Step 1: Baseline Publish Trigger ]
  └─ Engine: Revision Engine
  └─ Input: new_revision_id, User ID
  └─ Output: Transition Execution Signal

[ Step 2: WBS Structural Diff & Task Matching ]
  └─ Engine: Task Engine
  └─ Input: old_revision_id Tasks, new_revision_id Tasks
  └─ Output: Task Mapping Matrix (Matched, Added, Removed, Replaced)

[ Step 3: Open Activity Re-Mapping ]
  └─ Engine: Activity Engine / Open Activities Engine
  └─ Input: Active Open Activities, Task Mapping Matrix
  └─ Output: Updated Activity Links (re-pointed to new_revision_id)

[ Step 4: Outdated Activity Cancellation ]
  └─ Engine: Activity Engine
  └─ Input: Un-matched / Removed Activities in Revision N
  └─ Output: Activities transitioned to Cancelled state

[ Step 5: Revision Activation & Lock ]
  └─ Engine: Revision Engine
  └─ Input: old_revision_id, new_revision_id
  └─ Output: new_revision_id.is_active = TRUE, old_revision_id.is_active = FALSE

[ Step 6: Carry Forward Pool Regeneration ]
  └─ Engine: Carry Forward Engine
  └─ Input: new_revision_id, Active Activities Pool
  └─ Output: Regenerated Tomorrow's Open Activities Pool

[ Step 7: System Audit Event Logging ]
  └─ Engine: Audit Engine
  └─ Input: Event Type: Approve/Update, Entity: Programme Revision
  └─ Output: Audit log entry created

[ Step 8: Atomic Transaction Commit ]
  └─ Engine: Service Layer Context
  └─ Output: Baseline Transition Completed
```

---

# 6. Task & Activity Matching Rules

1. **Exact Match (Same WBS Code & Task Name):** Activity re-pointed directly to new `task_id` in `Revision N`. Status remains `Continue` or `Started`.
2. **Re-numbered WBS Match (Same MSP Unique ID / Task Name):** If WBS code changes (e.g., `1.1.2` → `1.1.3`) but MSP Unique ID matches, Activity re-pointed to new `task_id`.
3. **Variation Order (VO) / Added Task:** New tasks in `Revision N` without predecessors in `Revision N-1` generate new Activities initialized as `Not Started`.
4. **Removed / Deleted Task:** Activities linked to tasks deleted in `Revision N` transition to `Cancelled` and are removed from the Carry Forward pool.
5. **Replaced Task (VO/APK):** Old Activity marked `Cancelled`; new replacement Activity initialized as `Not Started`.

---

# 7. Historical Preservation & Immutability Rules

- **Immutable Historical Records:** All historical `site_diary`, `workforce`, `progress`, and `approval` records created under `Revision N-1` remain PERMANENTLY linked to `old_revision_id`.
- **Zero In-Place Mutation of Historical Entries:** Revision transitions NEVER update `revision_id` foreign keys on historical site diary rows.
- **Reporting Continuity:** Reports generated for dates prior to the transition reference `Revision N-1`; reports for dates after transition reference `Revision N`.

---

# 8. Carry Forward Behaviour During Revision Transition

```
REVISION N-1 (OLD)                    REVISION N (NEW)
├── Activity A (60% Progress)  ───►  Mapped to Task A' in Rev N (Carry Forward Continued)
├── Activity B (Removed)      ───►  Cancelled (Dropped from Open Pool)
└── (New VO Task C)           ───►  Initialized in Rev N (Added to Open Pool as Not Started)
```

- Ongoing unfinished works (Activity A) continue carrying forward into Today's Site Diary seamlessly.
- Decommissioned works (Activity B) drop out of Today's Open Pool automatically.
- New scope (Task C) becomes available for daily site selection.

---

# 9. Failure Scenarios & Rollback Protocols

| Failure Scenario | Root Cause | System Recovery & Rollback Action |
|---|---|---|
| **Broken WBS Mapping** | Critical task code mismatch in new MSP | Abort transition; Rollback transaction; Keep `Revision N-1` active |
| **Missing Parent Task** | Subtask orphaned in new schedule | Abort transition; Generate WBS structural error report for Planner |
| **Duplicate Active Revision** | Race condition during publish | Intercepted by `is_active` constraint check; Abort execution |
| **Audit Logging Error** | Database error during audit log insert | Abort entire transition transaction per ADR-010 audit rule |

---

# 10. Performance Specifications

- **Maximum Transition Latency:** Maximum 2.0 seconds execution time for transitioning projects with up to 5,000 tasks and 1,000 active open activities.
- **Batch Re-Mapping:** Task diff and Activity re-pointing executed in bulk SQL batch queries within a single transaction boundary.
- **Async Cache Invalidation:** Instantly invalidate edge-cached baseline WBS trees upon successful transaction commit.

---

# 11. Sequence Diagram (Textual)

```
Planner (Client)
  │
  │ 1. Publish New Revision (POST /api/programme/revision/publish)
  ▼
Revision REST API ───► Validate Request
  │
  │ 2. Invoke revisionService.publishRevision(newRevisionId)
  ▼
Revision Service
  │
  │───► Open DB Transaction Context
  │
  ├─► 3. taskService.diffRevisions(oldRevId, newRevId) ────► Task Repository
  ├─► 4. activityService.remapActivities(diffMatrix) ──────► Activity Repository
  ├─► 5. carryForwardService.regenerateOpenPool() ────────► Open Activities
  ├─► 6. revisionRepository.setActiveBaseline(newRevId) ──► DB: programme_revision
  └─► 7. auditService.createAudit() ──────────────────────► DB: audit
  │
  │───► Commit DB Transaction
  ▼
Revision REST API ───► Return HTTP 200 OK { data: ... }
```

---

# 12. Future Scalability Recommendations

1. **Automatic Similarity Matching:** Implement Levenshtein distance algorithms to auto-suggest task mappings when WBS codes change significantly.
2. **Visual Conflict Dashboard:** Provide Planners with an interactive WBS diff dashboard showing affected active activities before confirming baseline publishing.
3. **Background Async Transition Queue:** Process massive schedule revisions (>10,000 tasks) asynchronously via background job queues with real-time WebSocket progress notifications.

---
**END OF SPECIFICATION — DEV-010E**

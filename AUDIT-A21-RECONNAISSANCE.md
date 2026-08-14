# AUDIT-A21-RECONNAISSANCE

**Epic:** A21 (Start)
**Phase:** Reconnaissance ONLY
**Date:** 2026-08-15

## 1. Git Truth Inspection

- **Current Branch:** `develop`
- **HEAD Commit:** `a7f47cf4a7fe26749934022b2e9817c936722fc9` (chore: A20 phase 5 internal checkpoint)
- **origin/develop:** `a7f47cf4a7fe26749934022b2e9817c936722fc9` (Synchronized)
- **Working Tree:** Clean (nothing to commit except this file)
- **A20 State:** Intact. `A20-VERIFIED` tag is present.

## 2. Intelligence Engines Specifications

Based on the authoritative locked architecture (`AGENTS.md`) and boundary requirements (DB-014, DB-015, ADR-011):

- **TRE (Trade Resolution Engine):** Must resolve trades strictly via Priority 1 (MSP Resource) -> Priority 2 (Knowledge Engine) -> Priority 3 (Trade Library). Must use `ProgramKerjaBoundaryService` for D1 boundary compliance.
- **Knowledge Engine:** Must recommend trades using scoring criteria: AHI, Subtask, Frequency, Recency. Must return the Top 3 trades.
- **Workforce Engine (WRE):** Must recommend workforce based on resolved Trade.
- **MRE (Material Recommendation Engine):** Must recommend materials based on resolved Trade.
- **Activity/Open Activity Integration:** Operational Activity state is owned by `activity`. All engines must be integrated into the open activity pipeline to supply recommendations when an Activity is provisioned.
- **Contamination Rules:** `editingReportId` must strictly equal `site_diary.id`. Site diary logs must remain append-only.

## 3. Implementation vs Specification Mapping

We evaluated the current implementation on `develop` against the specifications.

### A. TRE Engine (`TreEngineService.ts`)
- **Status:** Implemented but **Dead/Unused**.
- **Compliance:** Internally complies with the 3-tier priority and ADR-011 (`ProgramKerjaBoundaryService` usage).
- **Gaps:** **CRITICAL** — It is completely disconnected from `OpenActivityService.ts` and is not executed in any production code path.

### B. Knowledge Engine (`KnowledgeEngineService.ts`)
- **Status:** Implemented but **Dead/Unused**.
- **Compliance:** **Boundary Violation / Specification Non-compliance**.
- **Gaps:** 
  - **HIGH** — Precedence scoring sorts by `Priority -> Specificity -> Version -> RuleId`. It completely ignores the architectural requirement to score by `AHI, Subtask, Frequency, Recency`.
  - **HIGH** — It returns only a single top match (`topMatch`) instead of the required **Top 3 trades**.
  - **CRITICAL** — It is completely disconnected from the open activity pipeline.

### C. Workforce Engine (`WorkforceEngineService.ts`)
- **Status:** Implemented but **Dead/Unused**.
- **Compliance:** Internally complies with boundaries.
- **Gaps:** **CRITICAL** — Not integrated.

### D. MRE Engine (`MaterialEngineService.ts`)
- **Status:** Implemented but **Dead/Unused**.
- **Compliance:** Internally complies with boundaries.
- **Gaps:** **CRITICAL** — Not integrated.

### E. Activity / Open Activity Integration (`OpenActivityService.ts`)
- **Status:** Partially implemented.
- **Compliance:** `assertRevisionOperational` ensures revision isolation. `site_diary_logs` append-only behavior is intact. Activity is the canonical persistence owner.
- **Gaps:** **CRITICAL** — `OpenActivityService` lost its dependency injection and orchestration logic for `TRE`, `WRE`, and `MRE`. The engines are not invoked when an activity is created. The `materialSnapshot` and other intelligence resolution projections are missing from the `OpenActivityDto` interface and mapping.

## 4. Contamination Audit

- **A17 Revision Lifecycle:** No contamination. `OpenActivityService` strictly respects `assertRevisionOperational`.
- **A19 Open Activities:** No contamination of core A19 functionality, but the integration boundary to intelligence engines is severed.
- **A20 Site Diary / REM-007:** No contamination. Architecture remains sound. `activity` owns state, `site_diary` owns daily execution records.
- **DB-014 / DB-015:** Intact.

## 5. Audit Conclusion

**STATUS: PASS WITH GAPS**

The intelligence engines are structurally present in `src/services/` and respect database boundaries. However, they are effectively **dead code** because they are fully decoupled from the core application workflow (`OpenActivityService`). Furthermore, the Knowledge Engine contains specific logical violations against the locked architecture rules.

### Gap Classification
1. **CRITICAL:** TRE, WRE, MRE, and Knowledge Engine are dead/unused and must be reintegrated into `OpenActivityService.ts`.
2. **HIGH:** `KnowledgeEngineService.ts` does not use `AHI`, `Subtask`, `Frequency`, `Recency` for scoring, and does not return the top 3 recommendations.
3. **HIGH:** `OpenActivityDto` and mappers do not include the intelligence snapshot fields.

## 6. Next Steps
Do not begin remediation until HQ reviews this reconnaissance report and explicitly authorizes the implementation phase. A detailed `implementation_plan.md` has been produced for HQ review.

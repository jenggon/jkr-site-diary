# AUDIT A22 RECONNAISSANCE: EXECUTION INTEGRITY & CROSS-ENGINE INTEGRATION

## 1. GIT TRUTH & BASELINE CONFIRMATION
- **Current Branch:** `develop`
- **A21 Sealed Baseline:** `e0001b9 merge: A21 Core Intelligence Engines` (Confirmed present)
- **A17/A19/A20 Integrity:** Verified intact. No contamination of revision lifecycle or canonical ownership structures.

## 2. SCOPE CONFIRMATION
This reconnaissance explicitly audits the integration pipeline and cross-engine behaviour:
`Programme → Task → Activity → Open Activity → Site Diary → Progress → Intelligence`

## 3. INTEGRATION EVIDENCE MATRIX

| Integration Surface | Authoritative Requirement | Actual Behaviour | Evidence | Status | Severity |
|----------------------|---------------------------|------------------|----------|--------|----------|
| **TRE → WRE/MRE** | Orchestrator must enforce TRE resolution before dependent WRE/MRE execution. | Intact. `IntelligenceOrchestratorService` explicitly chains TRE output into WRE/MRE. | `src/services/IntelligenceOrchestratorService.ts` | PASS | 🟢 LOW |
| **Activity → Site Diary** | Site Diary must reflect canonical Activity status and enforce revision safety. | Intact. `SiteDiaryService` validates `activity.revision_id` and rejects cross-revision or archived states. | `src/services/siteDiaryService.ts:106` | PASS | 🟢 LOW |
| **Activity/Site Diary → Progress** | Progress must accurately associate with active Activity/Site Diary state. | Deficient. `ProgressService` bypasses canonical validation, permitting Progress creation against non-existent or mismatched Activity/Site Diary. | `src/services/progressService.ts` & `src/repositories/progressRepository.ts` | FAIL | 🟠 HIGH |
| **API → Domain Service Boundaries** | APIs must route through domain services, not access DB directly. | Deficient. Multiple legacy APIs (`/api/resources`, `/api/trades`, `/api/reports`) execute raw `supabase` calls, bypassing domain logic. | `src/app/api/resources/route.ts` etc. | FAIL | 🟠 HIGH |
| **Site Diary Idempotency** | Prevent duplicate Site Diary entries for identical Date + Activity. | Handled via DB unique constraint (`"activity_id", "activity_date"`), but application layer fails to catch and propagate a domain error, throwing `UnknownError`. | `src/services/siteDiaryService.ts:165` | PARTIAL | 🟡 MEDIUM |
| **Progress Atomicity** | Atomic execution is required for business operations (ADR-010). | Missing. `updateProgress` explicitly states atomicity is deferred to "future implementation". | `src/services/progressService.ts:89` | FAIL | 🟠 HIGH |

## 4. END-TO-END EXECUTION TRACE
1. **Programme/Task:** Properly ingested and revisioned (A17/A18).
2. **Activity/Open Activity:** Provisioning uses atomic transactions via `TransactionManager` (A19).
3. **Site Diary:** Correctly enforces revision and Activity contextual integrity upon creation (A20).
4. **Progress:** **[BREAK IN PIPELINE]** Creation skips `TransactionManager` and upstream dependency validation.
5. **Intelligence:** Transient projection cleanly resolves dependencies (`TRE -> WRE -> MRE`) and isolates logic from persistence pipelines (A21).

## 5. SPECIFIC FINDINGS BY CATEGORY

### 5.1 Idempotency Findings
- **Finding:** `SiteDiaryService.createSiteDiary` lacks application-level idempotency checks. It relies strictly on the database schema to enforce uniqueness, which is mechanically secure but semantically poor.

### 5.2 Transaction / Atomicity Findings
- **Finding:** `progressService.ts` lacks transaction management (`ITransactionManager`). It directly invokes `progressRepository.createProgress`, leaving the system vulnerable to partial state updates if a surrounding operational transaction fails.

### 5.3 Error Propagation Findings
- **Finding:** Generic catch blocks in `SiteDiaryService.ts` (`catch (err: unknown) { return Failure(new UnknownError(...)) }`) mask explicit database constraints (like Unique Violations) into vague `UnknownError` responses, breaking client recovery mechanisms.

### 5.4 API / Service Boundary Findings
- **Finding:** Canonical backend mediation is bypassed by legacy read models. Routes such as `/api/resources`, `/api/buildings`, and `/api/project-summary` instantiate the `supabase` client directly.

### 5.5 Cross-Revision Safety Findings
- **Finding:** Cross-revision safety remains robust in the `Activity` and `Site Diary` domains, which accurately throw `SiteDiaryValidationError` and `ActivityRevisionSupersededError`. However, `ProgressEngine` is unaware of revisions, increasing the risk of cross-revision leakage.

## 6. A17/A19/A20/A21 NON-CONTAMINATION CHECK
- **Status:** PASS. No integration path investigated reopens or compromises the data ownership rules, transient nature, or lifecycle states defined in the preceding epics.

## 7. FINAL A22 STATUS
**A22 RECONNAISSANCE STATUS: PARTIAL**

### Summary of Next Steps
The pipeline is fundamentally intact across its modern segments (A17-A21). However, significant integration defects exist around the `ProgressEngine` boundary (atomicity/validation) and legacy API direct-database access. 

Remediation candidates include:
1. Enforcing Domain validation inside `progressService.ts`.
2. Refactoring legacy API routes to utilize domain services instead of direct DB access.
3. Enhancing Error Propagation for Unique Constraint violations in `SiteDiaryService.ts`.

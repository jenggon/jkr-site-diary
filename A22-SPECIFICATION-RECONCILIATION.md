# A22 SPECIFICATION RECONCILIATION

## 1. REPOSITORY ALIGNMENT
- **Baseline:** `develop` branch (A21 Core Intelligence Engines merged and verified).
- **Scope:** Execution Integrity & Cross-Engine Integration.
- **Verification Boundaries:**
  - A17 (Revision Lifecycle): **LOCKED**
  - A19 (Open Activity): **LOCKED**
  - A20 (Site Diary): **LOCKED**
  - A21 (Intelligence Engines): **LOCKED**

## 2. CROSS-ENGINE INTEGRATION FINDINGS

### Finding 1: ProgressEngine Domain Bypass & Atomicity Failure
- **Description:** The `ProgressEngine` (`src/services/progressService.ts`) violates integration integrity. It writes directly to the database without validating the existence or state of upstream canonical domains (`Activity`, `Site Diary`, `Programme Revision`). Additionally, it explicitly defers atomic transaction implementation despite ADR-010 requirements.
- **Severity:** 🟠 HIGH
- **Evidence:** `src/services/progressService.ts:89-96`.

### Finding 2: Direct Database Access via Legacy API Routes
- **Description:** Several read-heavy endpoints (`/api/resources`, `/api/trades`, `/api/reports`, etc.) bypass backend mediation and instantiate `supabase` client directly.
- **Severity:** 🟠 HIGH
- **Evidence:** `src/app/api/resources/route.ts:14`, `src/app/api/trades/route.ts:13`.

### Finding 3: Masked Duplicate Site Diary Exceptions
- **Description:** While duplicate Site Diary creation is mechanically prevented by a database unique constraint, `SiteDiaryService.createSiteDiary` swallows the specific database violation and returns a generic `UnknownError`. This masks idempotency checks and breaks explicit client-side handling.
- **Severity:** 🟡 MEDIUM
- **Evidence:** `src/services/siteDiaryService.ts:164-168`.

## 3. A17/A19/A20/A21 OVERLAP & CONTAMINATION ANALYSIS
A thorough cross-check confirms that:
- **No A17/A19/A20/A21 logic has been reopened or modified.**
- Site Diary's validation logic continues to enforce A17 revision rules accurately.
- `IntelligenceOrchestratorService` strictly preserves the Transient Projection architectural mandate established in A21.

## 4. REMEDIATION RECOMMENDATIONS
Before concluding A22, the following remediation measures are proposed (Pending HQ Authorization):

1. **Refactor `ProgressService`:**
   - Inject `TransactionManager`, `ActivityRepository`, and `SiteDiaryRepository`.
   - Validate upstream contextual states (D1 Revision Safety, Activity State) before creating/updating `Progress`.
   - Implement `TransactionManager` execution for atomic consistency.

2. **Refactor Legacy API Routes:**
   - Migrate endpoints that directly access `supabase` to utilize Domain Service patterns with Data Adapters.

3. **Enhance `SiteDiaryService` Idempotency Error Handling:**
   - Detect Postgres Unique Constraint violations (`23505`) and emit a typed domain error (`SiteDiaryAlreadyExistsError`) instead of `UnknownError`.

## 5. SPECIFICATION STATUS
- The repository integration evidence matrix has been populated.
- No A17/A19/A20/A21 boundary violations were uncovered; findings are purely isolated to unmediated external bounds (API, Progress).
- The A22 Specification Reconciliation is complete.

**RECOMMENDATION:** Proceed with a targeted architecture checkpoint regarding the remediation of `ProgressEngine` and API Boundaries.

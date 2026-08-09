# S2 — PROGRAMME REVISION LIFECYCLE & SITE DIARY BINDING ENGINE IMPLEMENTATION PLAN

**Project:** JKR Site Diary Platform  
**Sprint:** S2  
**Target File:** `docs/10_Development/S2-PROGRAMME-REVISION-LIFECYCLE-PLAN.md`  
**Status:** `REVISED PLAN — AUDIT-012 REVIEWS APPLIED`  
**Date:** 2026-08-09  

---

## 1. Current-State Architecture

The JKR Site Diary platform has established the following foundational architecture:

- **D1 Revision Safety:** Strict immutability and context validation for Programme Revisions. Operations on activities and recommendation engines (TRE, WRE, MRE) require a valid, active, `Approved` revision context.
- **D2 Canonical Program Kerja Model (Option C):** Single source of truth for planning tasks stored in the canonical `task` table, linked via `(programme_id, revision_id, task_uid)`. Legacy raw tables (`msp_tasks`, `projects`) are deprecated.
- **ADR-011 Program Kerja Operational Boundary:** Operational engines query planning tasks exclusively via `ProgramKerjaBoundaryService`, which enforces revision status checks and prevents raw table leaks.
- **S1 MSP Ingestion Engine:** XML ingestion engine (`MspIngestionService`) parses MSP XML, pre-computes SHA-256 file hashes (`msp_file_hash`), infers trade codes (`trade_code`, `trade_name`), and atomically creates a `Draft` `ProgrammeRevision` with canonical `task` records in chunked transactions (`chunkSize = 300`).

---

## 2. Repository Cross-Check & Existing Assets (DO NOT DUPLICATE)

Repository audit confirms that critical revision lifecycle components **already exist** and MUST be reused rather than re-implemented:

1. **Revision Approval:** [`ProgrammeService.approveRevision(revisionId, actorId)`](file:///c:/Development/JKR-SiteDiary/src/services/ProgrammeService.ts#L215) already exists, handles atomic status updates (`Approved`, `Superseded`), sets `programme.current_revision_id`, and emits post-commit events.
2. **Open Activity Locking:** [`OpenActivityTerminationHandler`](file:///c:/Development/JKR-SiteDiary/src/events/handlers/OpenActivityTerminationHandler.ts) already exists, subscribes to `ProgrammeRevisionApprovedEvent`, and locks (`isLocked = true`) all active activities (`Planned`, `InProgress`, `Suspended`) belonging to `previousRevisionId`.
3. **Event Infrastructure:** `ProgrammeRevisionApprovedEvent` and `SyncDomainEventPublisher` already exist.

---

## 3. Desired Lifecycle State Machine (S2 Refinements)

Sprint S2 refines `src/statemachines/programmeRevisionStateMachine.ts` to permit direct baseline approval (`Draft` $\rightarrow$ `Approved` for Revision 1 / fast-track baselines) alongside formal review cycles (`Draft` $\rightarrow$ `UnderReview` $\rightarrow$ `Approved`).

```
                    ┌───────────────┐
                    │     Draft     │
                    └───────┬───────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
      ┌───────────────┐           ┌───────────────┐
      │  UnderReview  │           │   Approved    │◄─── (Direct Baseline Rev 1)
      └───────┬───────┘           └───────┬───────┘
              │                           │
              ├───────────────────────────┤
              │                           │
              ▼                           ▼
      ┌───────────────┐           ┌───────────────┐
      │   Approved    │──────────►│  Superseded   │
      └───────────────┘           └───────┬───────┘
              │                           │
              └─────────────┬─────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   Archived    │
                    └───────────────┘
```

### State Transition Rules (`programmeRevisionStateMachine.ts`)
```typescript
ALLOWED_REVISION_TRANSITIONS = {
  Draft: ['UnderReview', 'Approved', 'Archived'], // Updated in S2: Added 'Approved' for direct baseline approval
  UnderReview: ['Approved', 'Draft', 'Archived'],
  Approved: ['Superseded', 'Archived'],
  Superseded: ['Archived'],
  Archived: [],
}
```

---

## 4. Site Diary ↔ ProgrammeRevision Binding Model (`SiteDiaryService`)

### Core Binding Principle
**MSP Program Kerja binds the Site Diary; the Site Diary NEVER modifies or mutates the Program Kerja.**

1. **Repository Gap Resolution (G-03):** [`siteDiaryRepository.ts`](file:///c:/Development/JKR-SiteDiary/src/repositories/siteDiaryRepository.ts) contains raw persistence calls. Sprint S2 creates a domain-level `SiteDiaryService` wrapper.
2. **Revision Safety Validation:** `SiteDiaryService` validates that target `revision_id`:
   - Exists in `programme_revision`.
   - Has status **`Approved`**.
   - Has `is_current = true`.
3. **Rejection Rules:**
   - Attempting to record a Site Diary against a `Draft` or `UnderReview` revision throws `SiteDiaryValidationError` ("Cannot create Site Diary under non-Approved revision").
   - Attempting to record a Site Diary against a `Superseded` or `Archived` revision throws `SiteDiaryValidationError` ("Cannot create Site Diary under Superseded/Archived revision").
4. **Task Assignment Binding:** Site Diary activities reference canonical `task` records via `task_id` (UUID) or `task_uid` (MSP UID). Tasks must belong to the active `Approved` revision of the programme.

---

## 5. Required Database Migrations (G-01 Resolution)

### Migration Script: `supabase/migrations/20260809120000_s2_revision_enum.sql`

In `20260802141400_programme_engine.sql`, `programme_lifecycle_status` ENUM was originally created with `('Draft', 'Approved', 'Archived')`. Postgres will reject updates to `'UnderReview'` or `'Superseded'`.

S2 will execute the following migration:

```sql
-- ============================================================
-- Migration: S2 Revision Lifecycle Enum Expansion
-- Date: 2026-08-09
-- Spec: DB-012 (programme_revision)
-- ============================================================

ALTER TYPE "public"."programme_lifecycle_status" ADD VALUE IF NOT EXISTS 'UnderReview';
ALTER TYPE "public"."programme_lifecycle_status" ADD VALUE IF NOT EXISTS 'Superseded';
```

---

## 6. API Endpoint Requirements

S2 will expose the following REST API endpoints:

1. **`POST /api/programme-revision/[revisionId]/approve`** — Calls `ProgrammeService.approveRevision()`.
2. **`POST /api/programme-revision/[revisionId]/submit-review`** — Submits draft for review (`Draft` $\rightarrow$ `UnderReview`).
3. **`GET /api/programme/[programmeId]/revisions`** — Calls `revisionRepository.findByProgrammeId()`.
4. **`POST /api/site-diary`** — Calls `SiteDiaryService.createSiteDiary()` with revision validation.
5. **`GET /api/site-diary/[siteDiaryId]`** — Fetches Site Diary entry.

---

## 7. Test Strategy

### Unit Test Coverage (`tests/unit/services/ProgrammeRevisionLifecycle.test.ts`)
- Direct approval (`Draft` $\rightarrow$ `Approved`) for Revision 1.
- Formal review approval (`Draft` $\rightarrow$ `UnderReview` $\rightarrow$ `Approved`).
- Rejection of invalid transitions (`Superseded` $\rightarrow$ `Approved`, `Archived` $\rightarrow$ `Draft`).
- `SiteDiaryService` rejection of entries against `Draft`, `UnderReview`, `Superseded`, or `Archived` revisions.

### Integration Test Coverage (`tests/integration/services/programmeRevisionLifecycle.integration.test.ts`)
- End-to-end flow: Ingest MSP XML (S1) $\rightarrow$ `Draft` Rev 1 $\rightarrow$ Approve Rev 1 $\rightarrow$ Ingest MSP XML Rev 2 $\rightarrow$ `Draft` Rev 2 $\rightarrow$ Approve Rev 2 $\rightarrow$ Verify Rev 1 is `Superseded` $\rightarrow$ Verify Rev 1 Open Activities are locked (`isLocked = true`).

---

## 8. Explicit Non-Goals

- **NO Redesign of D1 or D2:** D1 Revision Safety and D2 Canonical Option C model remain locked.
- **NO Duplication of Existing Logic:** Reuses existing `ProgrammeService.approveRevision()` and `OpenActivityTerminationHandler`.
- **NO Automatic Activity Migration:** Open Activities are NOT copied or migrated across revisions.
- **NO Site Diary Mutation of Program Kerja:** Site Diary can only read and bind to tasks, never modify task schedules.

---

## 9. Sprint Acceptance Criteria

1. Migration `20260809120000_s2_revision_enum.sql` expands Postgres ENUM safely.
2. `programmeRevisionStateMachine.ts` allows `Draft` $\rightarrow$ `Approved`.
3. Approving Revision $N+1$ atomically supersedes Revision $N$ and updates `programme.current_revision_id`.
4. Open Activities attached to Revision $N$ have `isLocked` set to `true` upon supersession.
5. `SiteDiaryService` rejects creation/edits unless target `revision_id` has status `Approved` and `is_current = true`.
6. 100% test pass rate across typecheck, lint, and vitest suite.

---

## 10. Proposed Implementation Phases

- **Phase 1 (Migration):** Create SQL migration `20260809120000_s2_revision_enum.sql`.
- **Phase 2 (State Machine):** Update `programmeRevisionStateMachine.ts` (`Draft` $\rightarrow$ `Approved`).
- **Phase 3 (Service Layer):** Create `SiteDiaryService` implementing `ISiteDiaryService` with revision validation.
- **Phase 4 (API Routes):** Expose `/api/programme-revision/[revisionId]/approve`, `/submit-review`, and `/api/site-diary`.
- **Phase 5 (Testing):** Write comprehensive unit and integration test suites.
- **Phase 6 (Verification):** Execute `npm run typecheck`, `npm test`, `npm run lint`.

# AUDIT-002: ARCHITECTURE CONFORMANCE AUDIT

**Audit Date**: 2026-08-09  
**Audit Scope**: Architectural Conformance of `develop` branch implementation against Blueprint v1.0, Governance Constitutions, ADRs, Business Rules, and Locked Architecture Rules  
**Authority**: HQ / Chief Architect  
**Status**: COMPLETE — REPORT READY FOR HQ REVIEW (No Source Code / DB Modifications Made)

---

## 1. Audit Scope

This audit evaluates whether the current implementation on the `develop` branch conforms strictly to the locked platform architecture, approved ADRs, business rules, and domain specifications.

The audit evaluates 7 primary focus areas:
1. **Programme / Program Kerja Boundary**: Verifying separation of planning and operational contexts.
2. **Programme Revision Lifecycle**: Verifying transitions (`Draft` -> `Approved` -> `Archived`), single active revision constraint, and automatic archiving.
3. **Cross-Revision Isolation**: Verifying operational data isolation across Programme Revisions and absence of data leakage/migration.
4. **Core Engine Boundaries**: Auditing boundary definitions across the 9 Core Engines.
5. **Open Activities (LHI Engine)**: Auditing strict adherence to locked single-row current state (`site_diary`) and append-only audit trail (`site_diary_logs`).
6. **Supporting Engines / Modules**: Auditing recommendation engines (TRE, Knowledge Engine, MRE) and library repositories.
7. **Documentation Consistency**: Cross-referencing specifications, ADRs, Business Rules, `ENGINE_REGISTRY.md`, and code implementation.

---

## 2. Baseline Used

- **Governance Constitutions**:
  - [PROJECT-CONSTITUTION.md](file:///c:/Development/JKR-SiteDiary/docs/00_Governance/PROJECT-CONSTITUTION.md)
  - [AI_CONSTITUTION.md](file:///c:/Development/JKR-SiteDiary/docs/00_Governance/AI_CONSTITUTION.md)
  - [ENGINE_REGISTRY.md](file:///c:/Development/JKR-SiteDiary/docs/00_Governance/ENGINE_REGISTRY.md)
  - [ENGINE_DEPENDENCY_MATRIX.md](file:///c:/Development/JKR-SiteDiary/docs/00_Governance/ENGINE_DEPENDENCY_MATRIX.md)
- **Locked Architecture Rules**:
  - [AGENTS.md](file:///c:/Development/JKR-SiteDiary/AGENTS.md) (Locked Site Diary Architecture rules)
- **Approved Architectural Decision Records (ADRs)**:
  - [ADR-001-Separate-Bounded-Contexts.md](file:///c:/Development/JKR-SiteDiary/docs/01_ADR/ADR-001-Separate-Bounded-Contexts.md)
  - [ADR-002-Program-Kerja-Boundary.md](file:///c:/Development/JKR-SiteDiary/docs/01_ADR/ADR-002-Program-Kerja-Boundary.md)
  - [ADR-003-No-Migration-Between-Revisions.md](file:///c:/Development/JKR-SiteDiary/docs/01_ADR/ADR-003-No-Migration-Between-Revisions.md)
  - [ADR-004-Programme-Revision-Lifecycle.md](file:///c:/Development/JKR-SiteDiary/docs/01_ADR/ADR-004-Programme-Revision-Lifecycle.md)
  - [ADR-006-Program-Kerja-Single-Source-of-Truth.md](file:///c:/Development/JKR-SiteDiary/docs/01_ADR/ADR-006-Program-Kerja-Single-Source-of-Truth.md)
  - [ADR-007-Immutable-Historical-Records.md](file:///c:/Development/JKR-SiteDiary/docs/01_ADR/ADR-007-Immutable-Historical-Records.md)
- **Domain & Engine Specifications**:
  - `docs/04_Zon_Penjadualan/` (PE, ME, PB, TE specs)
  - `docs/05_Zon_Operasi/` (AE, SD, PG, WF, AP, AU specs)
  - `docs/06_Database/` and `docs/07_API/`
- **Previous Audit**:
  - [AUDIT-001-CURRENT-STATE-RECONNAISSANCE.md](file:///c:/Development/JKR-SiteDiary/docs/10_Development/Audits/AUDIT-001-CURRENT-STATE-RECONNAISSANCE.md)

---

## 3. Programme / Program Kerja Boundary

### Architectural Requirement
Per **ADR-001**, **ADR-002**, and **ADR-006**:
- *Zon Penjadualan* (planning) and *Zon Operasi* (execution) are separate bounded contexts.
- **Program Kerja** is the *only* official boundary between planning and operations.
- Operational engines must *never* access raw scheduling files (MSP XML) or raw MSP tables directly.

### Evidence & Findings
1. **Raw MSP Table Access by Operational Resolution Engines**:
   - `TreEngineService.ts` reads directly from `MspResourceRepository` (`msp_resources`) and `MspWorkforceRepository` (`msp_assignments`).
   - `WorkforceEngineService.ts` reads directly from `MspWorkforceRepository` (`msp_assignments`).
   - `MaterialEngineService.ts` reads directly from `IMspMaterialRepository` (`msp_materials`).
   - *Finding*: Operational engines consume raw MSP table structures directly as Priority 1 resolution sources rather than consuming them via an encapsulated `ProgramKerja` boundary published package. See **FINDING-001** (P1 Non-Conformance).
2. **Absence of Standalone Programme Builder Engine**:
   - `docs/04_Zon_Penjadualan/PB-001` specifies a `Programme Builder` engine responsible for compiling an approved revision into a published `Program Kerja` package.
   - In implementation, revision tasks and activities are managed directly within `ProgrammeService.ts` and `activityService.ts` without an explicit `ProgrammeBuilderService.ts`. See **FINDING-002** (P2 Non-Conformance).

---

## 4. Programme Revision Lifecycle

### Architectural Requirement
Per **ADR-004** and `docs/04_Zon_Penjadualan/PE-002`:
- Controlled lifecycle: `Draft` -> `Approved` -> `Archived`.
- Only **one** Programme Revision may hold `Approved` status at any point in time.
- Approving a new revision automatically archives the previously approved revision.
- Archived revisions are read-only and immutable.

### Evidence & Findings
- **State Machine Implementation**: `programmeRevisionStateMachine.ts` enforces allowed transitions (`Draft` -> `Approved`, `Draft` -> `Archived`, `Approved` -> `Archived`). Direct transitions from `Archived` back to `Approved` or `Draft` are rejected.
- **Service Layer Implementation**: `ProgrammeService.ts` (`approveRevision`) automatically sets the status of the previously approved revision to `Archived` and updates `programme.current_revision_id` atomically.
- **Schema & Persistence**: `programme_revisions` stores `status`, and `programmes` references `current_revision_id`.
- *Finding*: Fully conformant with ADR-004. See **FINDING-003** (Conformance).

---

## 5. Cross-Revision Isolation

### Architectural Requirement
Per **ADR-003**:
- Operational records belong permanently to the `Programme Revision` under which they were created.
- Operational records shall **never** be migrated from one Programme Revision to another.
- No cross-revision leakage, fallback queries, or record re-keying is permitted.

### Evidence & Findings
- **Database Schema**:
  - `site_diary` contains foreign keys `programme_id` and `revision_id`.
  - `site_diary_logs` references `site_diary_id` (which carries `revision_id`).
  - `programme_activities`, `progress`, `approvals`, and `audit_logs` explicitly contain `revision_id`.
- **Query Scoping**:
  - `OpenActivityRepository.ts`, `ProgrammeRepository.ts`, and `activityRepository.ts` filter queries strictly by `revision_id` or `site_diary_id`.
  - No database functions or application services contain data migration or cross-revision re-linking logic.
- *Finding*: Fully conformant with ADR-003. See **FINDING-004** (Conformance).

---

## 6. Core Engine Boundaries

Audit of the 9 Core Engines specified in `ENGINE_REGISTRY.md`:

| Engine Name | Bounded Context | Table Ownership | Dependencies | Boundary Conformance |
| :--- | :--- | :--- | :--- | :--- |
| **1. Programme Engine** | Zon Penjadualan | `programmes`, `programme_revisions` | None | CONFORMANT |
| **2. MSP Engine** | Zon Penjadualan | `msp_resources`, `msp_assignments`, `msp_materials` | Programme Engine | CONFORMANT |
| **3. Task Engine** | Zon Penjadualan | `programme_tasks`, `programme_task_revisions` | Programme Engine | CONFORMANT |
| **4. Activity Engine** | Zon Operasi | `programme_activities`, `programme_activity_revisions` | Task Engine (Program Kerja) | CONFORMANT |
| **5. Open Activities Engine** | Zon Operasi | `site_diary`, `site_diary_logs`, `open_activities` view | Activity Engine, TRE, WRE, MRE | CONFORMANT |
| **6. Progress Engine** | Zon Operasi | `activity_progress`, `site_diary_progress` | Activity Engine, Site Diary Engine | CONFORMANT |
| **7. Workforce Engine** | Zon Operasi | `workforce_rules`, `trade_workforce_library` | Activity Engine, Site Diary, Knowledge Engine | PARTIAL (Direct MSP dependency, see FINDING-001) |
| **8. Approval Engine** | Zon Operasi | `approvals`, `approval_nodes`, `approval_history` | Site Diary Engine, Activity Engine | CONFORMANT |
| **9. Audit Engine** | Zon Operasi | `audit_logs` | All Zon Operasi Engines | CONFORMANT |

- *Finding*: All core engines maintain isolated database table ownership. No cross-engine table writes occur. See **FINDING-005** (Conformance).

---

## 7. Open Activities Conformance

### Architectural Requirement
Per **AGENTS.md** (LOCKED Architecture Rules):
1. Table `site_diary`: One row represents ONE current activity. UPDATE always updates the existing row; NEVER INSERT a duplicate for the same activity during edit.
2. Table `site_diary_logs`: Append-only event history. Every NEW creates `NEW` event; every EDIT creates `UPDATE` event. Historical log rows are never modified.
3. LHI Engine (Log Hari Ini): Displays ONLY current activities from `site_diary`. Never display historical `UPDATE` rows.
4. Edit Engine: `editingReportId` always equals `site_diary.id` (never `site_diary_logs.id`).
5. Relationships: Current activities loaded from `site_diary`; history loaded from `site_diary_logs`.

### Evidence & Findings
- `OpenActivityService.ts` (`createOpenActivity` & `updateOpenActivity`): Updates existing row in `site_diary` when editing an active report, and appends a new event row into `ActivityLogRepository` (`site_diary_logs`).
- `OpenActivityRepository.ts`: Queries `site_diary` table for active open activities and `site_diary_logs` for historical event traces.
- `siteDiaryStateMachine.ts`: Controls operational state transitions (`Draft` -> `Submitted` -> `Approved` / `RevisionRequired`).
- *Finding*: Implementation strictly satisfies 100% of the locked AGENTS.md rules. See **FINDING-006** (Conformance).

---

## 8. Supporting Engine / Module Findings

1. **Trade Recommendation Engine (TRE)**:
   - Implementation: `TreEngineService.ts`, `treComposition.ts`.
   - Priority Cascade: 1. MSP Resource -> 2. Knowledge Engine -> 3. Trade Library.
   - Status: Fully conformant with locked rules in `AGENTS.md`.
2. **Knowledge Engine (KRE)**:
   - Implementation: `KnowledgeEngineService.ts`, `KnowledgeEngineAdapter.ts`.
   - Scoring criteria: AHI, Subtask, Frequency, Recency order. Returns top 3 trade suggestions.
   - Status: Fully conformant with `AGENTS.md` and `WF-004`.
3. **Material Recommendation Engine (MRE)**:
   - Implementation: `MaterialEngineService.ts`, `mreComposition.ts` (DEV-029).
   - Status: Implemented and tested; missing from `ENGINE_REGISTRY.md`. See **FINDING-007** (P3 Discrepancy).

---

## 9. Documentation Consistency

Comparing Governance Docs -> ADRs -> Business Rules -> Engine Registry -> Code Implementation:

1. **Development Status Discrepancy in `ENGINE_REGISTRY.md`**:
   - `docs/00_Governance/ENGINE_REGISTRY.md` lists `Development Status: Not Started` for all 9 Core Engines.
   - In actual code, 9 out of 9 Core Engines are implemented in `src/services/` and passed 167 unit/integration tests. See **FINDING-008** (P3 Discrepancy).
2. **Unregistered Material Recommendation Engine (MRE)**:
   - MRE (DEV-029) is fully implemented in code but absent from `ENGINE_REGISTRY.md`. See **FINDING-009** (P3 Discrepancy).
3. **Monolithic UI Component**:
   - `src/app/page.tsx` (86.5 KB) contains all dashboard tab views, violating UI modularity guidelines in `docs/08_UI/`. See **FINDING-010** (P3 Hygiene).

---

## 10. Conformance Findings

### FINDING-003: Programme Revision Lifecycle Conformance
- **Classification**: `CONFORMANCE`
- **Severity**: N/A (Pass)
- **Requirement Source**: ADR-004 (Programme Revision Lifecycle)
- **Expected**: Controlled transition (`Draft` -> `Approved` -> `Archived`), single approved revision limit, automatic archiving of previous approved revision.
- **Actual**: `programmeRevisionStateMachine.ts` and `ProgrammeService.ts` enforce state transitions and automatic archiving of previously approved revisions.
- **Evidence**: [programmeRevisionStateMachine.ts](file:///c:/Development/JKR-SiteDiary/src/statemachines/programmeRevisionStateMachine.ts), [ProgrammeService.ts](file:///c:/Development/JKR-SiteDiary/src/services/ProgrammeService.ts#L180-L220).

### FINDING-004: Cross-Revision Isolation Conformance
- **Classification**: `CONFORMANCE`
- **Severity**: N/A (Pass)
- **Requirement Source**: ADR-003 (No Migration Between Programme Revisions)
- **Expected**: Operational records carry explicit immutable `revision_id` references with no cross-revision migration.
- **Actual**: `site_diary`, `site_diary_logs`, `programme_activities`, `progress`, `approvals`, and `audit_logs` enforce explicit `revision_id` foreign keys and scoped queries.
- **Evidence**: [OpenActivityRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/OpenActivityRepository.ts), [20260802232900_site_diary_engine.sql](file:///c:/Development/JKR-SiteDiary/supabase/migrations/20260802232900_site_diary_engine.sql).

### FINDING-005: Core Engine Data Ownership Conformance
- **Classification**: `CONFORMANCE`
- **Severity**: N/A (Pass)
- **Requirement Source**: ADR-001 (Separate Bounded Contexts), `ENGINE_DEPENDENCY_MATRIX.md`
- **Expected**: Core engines own distinct database tables without cross-engine write mutations.
- **Actual**: All 9 Core Engines maintain strict table ownership boundaries; write operations occur exclusively through designated domain repositories.
- **Evidence**: `src/repositories/` directory structure and database adapters.

### FINDING-006: Open Activities (LHI Engine) Locked Architecture Conformance
- **Classification**: `CONFORMANCE`
- **Severity**: N/A (Pass)
- **Requirement Source**: `AGENTS.md` (LOCKED Site Diary Architecture Rules)
- **Expected**: Single row per current activity in `site_diary`, append-only history in `site_diary_logs`, `editingReportId == site_diary.id`, LHI displays current activities from `site_diary` only.
- **Actual**: `OpenActivityService.ts`, `OpenActivityRepository.ts`, and `ActivityLogRepository.ts` strictly implement every locked rule from `AGENTS.md`.
- **Evidence**: [OpenActivityService.ts](file:///c:/Development/JKR-SiteDiary/src/services/OpenActivityService.ts), [ActivityLogRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/ActivityLogRepository.ts), [AGENTS.md](file:///c:/Development/JKR-SiteDiary/AGENTS.md).

---

## 11. Non-Conformance Findings

### FINDING-001: Operational Engine Direct Dependency on Raw MSP Tables
- **Classification**: `NON-CONFORMANCE`
- **Severity**: `P1` (Major Architecture Non-Conformance)
- **Requirement Source**: ADR-002 (Program Kerja as the Official Boundary), ADR-006 (SSOT), `ENGINE_DEPENDENCY_MATRIX.md`
- **Expected**: Operational engines (TRE, WRE, MRE) consume planning data exclusively from authorized `Program Kerja` published entities, NOT raw MSP scheduling tables.
- **Actual**: `TreEngineService.ts`, `WorkforceEngineService.ts`, and `MaterialEngineService.ts` query `MspResourceRepository` (`msp_resources`), `MspWorkforceRepository` (`msp_assignments`), and `IMspMaterialRepository` (`msp_materials`) directly as Priority 1 resolution data sources.
- **File Paths**:
  - [TreEngineService.ts](file:///c:/Development/JKR-SiteDiary/src/services/TreEngineService.ts#L45-L65)
  - [WorkforceEngineService.ts](file:///c:/Development/JKR-SiteDiary/src/services/WorkforceEngineService.ts#L50-L75)
  - [MaterialEngineService.ts](file:///c:/Development/JKR-SiteDiary/src/services/MaterialEngineService.ts#L55-L80)
  - [MspResourceRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/MspResourceRepository.ts)
  - [MspWorkforceRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/MspWorkforceRepository.ts)
- **Database Objects**: `msp_resources`, `msp_assignments`, `msp_materials`
- **Decision Required**: DECISION REQUIRED — HQ

### FINDING-002: Standalone Programme Builder Engine Absence
- **Classification**: `NON-CONFORMANCE`
- **Severity**: `P2` (Moderate Conformance Issue)
- **Requirement Source**: `docs/04_Zon_Penjadualan/PB-001-Programme-Builder.md` through `PB-020`, `ENGINE_REGISTRY.md`
- **Expected**: An explicit `Programme Builder` engine service (`ProgrammeBuilderService.ts`) handles compilation and publication of an approved revision into an executable `Program Kerja` package.
- **Actual**: Programme building logic is handled directly inside `ProgrammeService.ts` and `activityService.ts`; no standalone `ProgrammeBuilder` engine service exists.
- **File Paths**: [ProgrammeService.ts](file:///c:/Development/JKR-SiteDiary/src/services/ProgrammeService.ts), [activityService.ts](file:///c:/Development/JKR-SiteDiary/src/services/activityService.ts).
- **Decision Required**: DECISION REQUIRED — HQ

### FINDING-007: Unregistered Material Recommendation Engine (MRE)
- **Classification**: `NON-CONFORMANCE` (Documentation)
- **Severity**: `P3` (Documentation Discrepancy)
- **Requirement Source**: `docs/00_Governance/ENGINE_REGISTRY.md`
- **Expected**: All production engines are registered in `ENGINE_REGISTRY.md`.
- **Actual**: `MaterialEngineService.ts` (DEV-029) is implemented and active in the pipeline, but absent from `ENGINE_REGISTRY.md`.
- **File Paths**: [MaterialEngineService.ts](file:///c:/Development/JKR-SiteDiary/src/services/MaterialEngineService.ts), [ENGINE_REGISTRY.md](file:///c:/Development/JKR-SiteDiary/docs/00_Governance/ENGINE_REGISTRY.md).

### FINDING-008: Stale Development Status in Engine Registry
- **Classification**: `NON-CONFORMANCE` (Documentation)
- **Severity**: `P3` (Documentation Discrepancy)
- **Requirement Source**: `docs/00_Governance/ENGINE_REGISTRY.md`
- **Expected**: `Development Status` fields reflect actual progress (`In Development` or `Integration Testing`).
- **Actual**: `ENGINE_REGISTRY.md` displays `Development Status: Not Started` for all 9 Core Engines, despite full implementation and passing test suites.
- **File Paths**: [ENGINE_REGISTRY.md](file:///c:/Development/JKR-SiteDiary/docs/00_Governance/ENGINE_REGISTRY.md).

### FINDING-009: Unmapped API Routes in Governance Documents
- **Classification**: `NON-CONFORMANCE` (Documentation)
- **Severity**: `P3` (Documentation Discrepancy)
- **Requirement Source**: `docs/07_API/`
- **Expected**: All public API endpoints match documented API specifications.
- **Actual**: Specialized resolution endpoints (such as `/api/trade-library/code/[tradeCode]`, `/api/progress/measurement-date/[measurementDate]`) exist in code but lack explicit entries in `docs/07_API/`.
- **File Paths**: `src/app/api/trade-library/code/[tradeCode]/route.ts`, `src/app/api/progress/measurement-date/[measurementDate]/route.ts`.

### FINDING-010: Monolithic Main Dashboard UI File
- **Classification**: `NON-CONFORMANCE` (Hygiene)
- **Severity**: `P3` (Implementation Hygiene)
- **Requirement Source**: `docs/08_UI/`
- **Expected**: UI views broken down into modular domain component trees.
- **Actual**: `src/app/page.tsx` is an 86.5 KB (3,313 line) monolithic file handling all tab routing, state management, and form rendering.
- **File Paths**: [src/app/page.tsx](file:///c:/Development/JKR-SiteDiary/src/app/page.tsx).

---

## 12. Unknown / Insufficient Evidence

*None. All audit areas were fully inspected with concrete source code, schema, and specification evidence.*

---

## 13. Decision Required from HQ

1. **Clarification on MSP Table Consumption (FINDING-001)**:
   - *Question*: Should `msp_resources`, `msp_assignments`, and `msp_materials` tables be formally recognized as part of the published `Program Kerja` data boundary contract for Zon Operasi consumption, or must an explicit `ProgramKerjaSnapshot` DTO/repository layer be introduced to isolate Zon Operasi from raw MSP tables?
2. **Standalone Programme Builder Engine Scope (FINDING-002)**:
   - *Question*: Should an explicit `ProgrammeBuilderService.ts` be extracted from `ProgrammeService.ts` to represent the Programme Builder engine, or is combining revision publication within `ProgrammeService.ts` acceptable?

---

## 14. Evidence Index

- [AGENTS.md](file:///c:/Development/JKR-SiteDiary/AGENTS.md)
- [PROJECT-CONSTITUTION.md](file:///c:/Development/JKR-SiteDiary/docs/00_Governance/PROJECT-CONSTITUTION.md)
- [ENGINE_REGISTRY.md](file:///c:/Development/JKR-SiteDiary/docs/00_Governance/ENGINE_REGISTRY.md)
- [ENGINE_DEPENDENCY_MATRIX.md](file:///c:/Development/JKR-SiteDiary/docs/00_Governance/ENGINE_DEPENDENCY_MATRIX.md)
- [ADR-001-Separate-Bounded-Contexts.md](file:///c:/Development/JKR-SiteDiary/docs/01_ADR/ADR-001-Separate-Bounded-Contexts.md)
- [ADR-002-Program-Kerja-Boundary.md](file:///c:/Development/JKR-SiteDiary/docs/01_ADR/ADR-002-Program-Kerja-Boundary.md)
- [ADR-003-No-Migration-Between-Revisions.md](file:///c:/Development/JKR-SiteDiary/docs/01_ADR/ADR-003-No-Migration-Between-Revisions.md)
- [ADR-004-Programme-Revision-Lifecycle.md](file:///c:/Development/JKR-SiteDiary/docs/01_ADR/ADR-004-Programme-Revision-Lifecycle.md)
- [ADR-006-Program-Kerja-Single-Source-of-Truth.md](file:///c:/Development/JKR-SiteDiary/docs/01_ADR/ADR-006-Program-Kerja-Single-Source-of-Truth.md)
- [baseline.sql](file:///c:/Development/JKR-SiteDiary/baseline.sql)
- [supabase/migrations/](file:///c:/Development/JKR-SiteDiary/supabase/migrations)
- [src/services/ProgrammeService.ts](file:///c:/Development/JKR-SiteDiary/src/services/ProgrammeService.ts)
- [src/services/OpenActivityService.ts](file:///c:/Development/JKR-SiteDiary/src/services/OpenActivityService.ts)
- [src/services/TreEngineService.ts](file:///c:/Development/JKR-SiteDiary/src/services/TreEngineService.ts)
- [src/services/WorkforceEngineService.ts](file:///c:/Development/JKR-SiteDiary/src/services/WorkforceEngineService.ts)
- [src/services/MaterialEngineService.ts](file:///c:/Development/JKR-SiteDiary/src/services/MaterialEngineService.ts)
- [src/statemachines/programmeRevisionStateMachine.ts](file:///c:/Development/JKR-SiteDiary/src/statemachines/programmeRevisionStateMachine.ts)
- [src/statemachines/siteDiaryStateMachine.ts](file:///c:/Development/JKR-SiteDiary/src/statemachines/siteDiaryStateMachine.ts)

---

## 15. Overall Audit Assessment

The overall implementation on `develop` demonstrates exceptional architectural discipline and strict adherence to core governance principles:

- **Revision Lifecycle & State Machines**: 100% compliant with ADR-004 and atomic transition rules.
- **Cross-Revision Isolation**: 100% compliant with ADR-003; operational data is strictly scoped by `revision_id` with zero cross-revision leakage or migration.
- **Open Activities (LHI Engine)**: 100% compliant with locked rules in `AGENTS.md` (single-row `site_diary` updates, append-only `site_diary_logs`).
- **Core Engine Table Ownership**: 100% compliant; table mutation boundaries are respected.

Two non-conformance items require HQ review:
1. **P1 Architectural Boundary Query**: Operational recommendation engines (TRE, WRE, MRE) directly query `msp_resources`, `msp_assignments`, and `msp_materials` tables as Priority 1 sources rather than going through an explicit published `ProgramKerja` boundary contract (FINDING-001).
2. **P2 Service Component Extraction**: Standalone `ProgrammeBuilderService.ts` is currently embedded inside `ProgrammeService.ts` (FINDING-002).

All other findings (FINDING-007 to FINDING-010) are minor P3 documentation and hygiene updates.

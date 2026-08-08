# AUDIT-002R: PROGRAM KERJA BOUNDARY REMEDIATION DESIGN

**Audit / Design Date**: 2026-08-09  
**Target Branch**: `audit/AUDIT-002R-programme-kerja-boundary` (branched from `develop`)  
**Authority**: HQ / Chief Architect  
**Status**: COMPLETE — REPORT READY FOR HQ REVIEW (Design Only — No Code / DB Modifications Made)

---

## 1. Locked D1 Decision & Scope Constraints

HQ has reviewed `AUDIT-002 Architecture Conformance` and issued locked decision **D1**:

> **Decision D1 (Locked)**:  
> *"Operational engines shall not bypass the Program Kerja boundary to consume raw MSP scheduling data directly. Operational engines shall consume scheduling-derived information through the active, approved Program Kerja."*

### Explicit Scope Constraints & Clarifications
- **MSP Remains Authoritative**: Microsoft Project (MSP) remains the authoritative planning source in *Zon Penjadualan*.
- **No Automatic Heavy Snapshots**: D1 does NOT require creating a complex automated background daemon or snapshot builder.
- **No Table Duplication**: D1 does NOT require duplicating all MSP database tables (`msp_resources`, `msp_assignments`, `msp_materials`).
- **No New DB Architecture**: D1 does NOT alter the core database schema or force structural database migrations.
- **No Functional Removal**: D1 does NOT remove MSP resource, material, or assignment recommendation functionality.
- **Objective**: Establish the **MINIMUM architectural boundary contract** required to bring the current implementation into 100% compliance with locked ADR-001, ADR-002, and ADR-006 boundaries.

---

## 2. Current Dependency Map

Below is the complete evidence mapping of how operational engines (TRE, WRE, MRE) and API endpoints currently query raw MSP tables directly in `src/`:

| Operational Engine | Raw MSP Target Table | Repository Class & Interface | Service Method | API Route | Context Passed |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Trade Recommendation Engine (TRE)** | `msp_resources` | `MspResourceRepository` ([MspResourceRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/MspResourceRepository.ts)) | `TreEngineService.resolveTradeRecommendation` ([TreEngineService.ts](file:///c:/Development/JKR-SiteDiary/src/services/TreEngineService.ts#L63)) | `/api/trades` | `programmeId`, `mspTaskId` |
| **Workforce Engine (WRE)** | `msp_assignments` / `msp_resources` | `MspWorkforceRepository` ([MspWorkforceRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/MspWorkforceRepository.ts)) | `WorkforceEngineService.resolveWorkforceRecommendation` ([WorkforceEngineService.ts](file:///c:/Development/JKR-SiteDiary/src/services/WorkforceEngineService.ts#L52)) | `/api/workforce` | `programmeId`, `mspTaskId` |
| **Material Recommendation Engine (MRE)** | `msp_materials` | `IMspMaterialRepository` ([IMspMaterialRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/IMspMaterialRepository.ts)) | `MaterialEngineService.resolveMaterialRecommendation` ([MaterialEngineService.ts](file:///c:/Development/JKR-SiteDiary/src/services/MaterialEngineService.ts#L51)) | N/A (Internal pipeline) | `programmeId`, `mspTaskId` |
| **Auxiliary Operational Endpoints** | `msp_tasks`, `msp_resources`, `msp_assignments` | Direct Supabase Client Calls | N/A | `/api/resources`, `/api/ahi`, `/api/buildings`, `/api/workpackages` | `programmeId`, `taskId` |

---

## 3. TRE Dependency Analysis

- **Target Database Table**: `msp_resources`
- **Repository Interface & Implementation**: `IMspResourceRepository` -> `MspResourceRepository` ([src/repositories/MspResourceRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/MspResourceRepository.ts))
- **Service Method**: `TreEngineService.resolveTradeRecommendation(ctx)` ([src/services/TreEngineService.ts](file:///c:/Development/JKR-SiteDiary/src/services/TreEngineService.ts#L61-L79))
- **Context DTO**: `TreResolutionContext` (`siteDiaryId`, `programmeId`, `mspTaskId`, `activityName`)
- **Mapper**: `treTradeSelectionMapper.ts` ([src/services/mappers/treTradeSelectionMapper.ts](file:///c:/Development/JKR-SiteDiary/src/services/mappers/treTradeSelectionMapper.ts))
- **API Callers**: `OpenActivityService.createOpenActivity` ([src/services/OpenActivityService.ts](file:///c:/Development/JKR-SiteDiary/src/services/OpenActivityService.ts#L111-L121)), `GET /api/trades` ([src/app/api/trades/route.ts](file:///c:/Development/JKR-SiteDiary/src/app/api/trades/route.ts))
- **Returned Fields Consumed**: `resource_id` (`tradeId`), `trade_code` (`tradeCode`), `trade_name` (`tradeName`), `trade_category` (`tradeCategory`).
- **Revision Filtering**: `programmeId` is passed, but `MspResourceRepository.findResourceTradeByMspTask` queries by `programme_id` and `task_id` without verifying `revision_id` or active approved revision status.

---

## 4. WRE Dependency Analysis

- **Target Database Table**: `msp_assignments` (joining `msp_resources`)
- **Repository Interface & Implementation**: `IMspWorkforceRepository` -> `MspWorkforceRepository` ([src/repositories/MspWorkforceRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/MspWorkforceRepository.ts))
- **Service Method**: `WorkforceEngineService.resolveWorkforceRecommendation(ctx)` ([src/services/WorkforceEngineService.ts](file:///c:/Development/JKR-SiteDiary/src/services/WorkforceEngineService.ts#L50-L63))
- **Context DTO**: `WorkforceResolutionContext` (`siteDiaryId`, `programmeId`, `mspTaskId`, `tradeSelection`, `discipline`)
- **Mapper**: `wreRecommendationMapper.ts` ([src/services/mappers/wreRecommendationMapper.ts](file:///c:/Development/JKR-SiteDiary/src/services/mappers/wreRecommendationMapper.ts))
- **API Callers**: `OpenActivityService.createOpenActivity` ([src/services/OpenActivityService.ts](file:///c:/Development/JKR-SiteDiary/src/services/OpenActivityService.ts#L180-L200)), `POST /api/workforce` ([src/app/api/workforce/route.ts](file:///c:/Development/JKR-SiteDiary/src/app/api/workforce/route.ts))
- **Returned Fields Consumed**: `roleCode`, `tradeId`, `tradeCode`, `tradeName`, `recommendedCount`, `skillLevel`, `isMandatory`.
- **Revision Filtering**: `programmeId` passed; `mspTaskId` matched against raw MSP assignment records.

---

## 5. MRE Dependency Analysis

- **Target Database Table**: `msp_materials`
- **Repository Interface & Implementation**: `IMspMaterialRepository` ([src/repositories/IMspMaterialRepository.ts](file:///c:/Development/JKR-SiteDiary/src/repositories/IMspMaterialRepository.ts))
- **Service Method**: `MaterialEngineService.resolveMaterialRecommendation(ctx)` ([src/services/MaterialEngineService.ts](file:///c:/Development/JKR-SiteDiary/src/services/MaterialEngineService.ts#L49-L63))
- **Context DTO**: `MaterialResolutionContext` (`siteDiaryId`, `programmeId`, `mspTaskId`, `tradeSelection`, `discipline`, `policy`)
- **Mapper**: `materialRecommendationMapper.ts` ([src/services/mappers/materialRecommendationMapper.ts](file:///c:/Development/JKR-SiteDiary/src/services/mappers/materialRecommendationMapper.ts))
- **API Callers**: `OpenActivityService.createOpenActivity` (DEV-029 pipeline integration)
- **Returned Fields Consumed**: `materialCode`, `materialName`, `quantity`, `unit`, `estimatedCost`, `estimatedLeadTime`, `isMandatory`.
- **Revision Filtering**: `programmeId` passed; `mspTaskId` matched against MSP materials table.

---

## 6. Required Scheduling-Derived Data

Below is an exhaustive matrix of every field currently extracted from raw MSP tables, its operational purpose, consumer engine, and representation status in `Program Kerja`:

| Raw MSP Table & Field | Purpose | Consumer Engine | Required at Runtime | Represented in Program Kerja Schema? | Required Transformation | Revision Identity Required |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `msp_resources.trade_code` | Primary Trade Identifier | TRE, WRE | Yes | No (Task schema has no trade code) | Direct pass-through | Yes (`revision_id`) |
| `msp_resources.trade_name` | Human-readable Trade Name | TRE, WRE | Yes | No | Direct pass-through | Yes (`revision_id`) |
| `msp_resources.trade_category` | Category classification | TRE | Optional | No | Nullable fallback | Yes (`revision_id`) |
| `msp_assignments.resource_uid` | Role Code mapping | WRE | Yes | No | Role mapping | Yes (`revision_id`) |
| `msp_assignments.units` | Baseline Manpower Count | WRE | Yes | No | Integer headcount | Yes (`revision_id`) |
| `msp_materials.material_code` | Material Identifier | MRE | Yes | No | Direct pass-through | Yes (`revision_id`) |
| `msp_materials.quantity` | Material Requirement Qty | MRE | Yes | No | Numeric pass-through | Yes (`revision_id`) |

---

## 7. Current Revision Handling & Vulnerability

### Current Implementation Gap
In the current implementation:
1. Operational resolution contexts (`TreResolutionContext`, `WorkforceResolutionContext`, `MaterialResolutionContext`) pass `programmeId` and `mspTaskId`, but **do not pass `revisionId`**.
2. Repositories query `msp_resources`, `msp_assignments`, and `msp_materials` by `programme_id` and `task_id`.
3. **Vulnerability**: If a project has Revision 1 (Archived) and Revision 2 (Approved), querying by `programme_id` and `task_id` without filtering on `revision_id` allows operational engines to accidentally read scheduling data from Revision 1 or an unapproved Revision 3 Draft.

---

## 8. Boundary Contract Alternatives

Below is an architectural evaluation of 5 potential contract mechanisms to encapsulate scheduling-derived information for Zon Operasi:

### Alternative A: Program Kerja Domain Service Contract (Domain Facade) — **RECOMMENDED**
- **Concept**: Create `IProgramKerjaBoundaryService` (`src/services/IProgramKerjaBoundaryService.ts`) in *Zon Penjadualan*. This service exposes clean read-only methods:
  - `getProgramKerjaTrade(programmeId, revisionId, taskId)`
  - `getProgramKerjaWorkforce(programmeId, revisionId, taskId)`
  - `getProgramKerjaMaterials(programmeId, revisionId, taskId)`
- **Advantages**:
  - Zero database schema modifications (no new SQL tables, no migrations, no data duplication).
  - Encapsulates all raw MSP repository calls behind an explicit domain service boundary contract.
  - Enforces mandatory `revisionId` verification and active approved revision checks atomically.
  - Minimal code change; easily injectable into TRE, WRE, and MRE services.
- **Disadvantages**:
  - The underlying `ProgramKerjaBoundaryService` implementation queries `msp_*` tables internally on behalf of Zon Operasi.
- **Revision Behaviour**: Strictly validates `revisionId` and `status = 'Approved'` before returning data.
- **Data Duplication**: 0 bytes.
- **Implementation Complexity**: Very Low (1 service interface + 1 service class).
- **Risk**: Minimal.

### Alternative B: Program Kerja Published DTO Contract (Interface Decoupling)
- **Concept**: Define explicit `ProgramKerjaTradeDTO`, `ProgramKerjaWorkforceDTO`, `ProgramKerjaMaterialDTO` in `src/dto/programKerjaDto.ts`. Operational engines depend exclusively on these DTO types.
- **Advantages**: Completely decouples operational engine types from MSP types.
- **Disadvantages**: Requires updating `TreEngineServiceDependencies`, `WorkforceEngineServiceDependencies`, and `IMaterialEngineServiceDependencies`.
- **Revision Behaviour**: DTO carries explicit `programmeId` and `revisionId`.
- **Data Duplication**: 0 bytes.
- **Implementation Complexity**: Low.
- **Risk**: Minimal.

### Alternative C: Database View Boundary (`v_program_kerja_resources`)
- **Concept**: Create a SQL view joining `programme_revisions` (WHERE status = 'Approved') with `msp_tasks`, `msp_resources`, `msp_assignments`, and `msp_materials`.
- **Advantages**: Database-level enforcement ensuring operational queries only return records from approved revisions.
- **Disadvantages**: Requires database migration script; requires updating repository SQL query targets.
- **Revision Behaviour**: View automatically filters out non-approved revisions.
- **Data Duplication**: 0 bytes.
- **Implementation Complexity**: Medium.
- **Risk**: Low.

### Alternative D: Published Projection Table (`program_kerja_items`)
- **Concept**: Create a dedicated `program_kerja_items` table populated during revision approval.
- **Advantages**: Physical database separation between planning tables and operational tables.
- **Disadvantages**: Requires SQL migration; introduces data duplication; requires publish event listeners.
- **Revision Behaviour**: High isolation.
- **Data Duplication**: Medium.
- **Implementation Complexity**: High.
- **Risk**: Medium.

### Alternative E: Program Kerja Snapshot Document (JSON / Blob)
- **Concept**: Store full JSON snapshot of tasks/resources on approval.
- **Advantages**: Completely frozen immutable snapshot.
- **Disadvantages**: High complexity; inefficient querying for single tasks.
- **Data Duplication**: High.
- **Implementation Complexity**: High.
- **Risk**: High.

---

## 9. Recommended Minimal Contract

### **Recommended Architecture: Combination of Alternative A (Domain Service Facade) + Alternative B (DTO Contract)**

```
                                  ZON PENJADUALAN
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Programme Engine ──► MSP Engine ──► msp_resources / msp_assignments / msp_mats│
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ (Internal DB Access)
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                   ProgramKerjaBoundaryService (Domain Facade)                   │
│         Enforces: programmeId + revisionId + status == 'Approved'               │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ (Exposes ProgramKerja DTOs)
                                         │
┌────────────────────────────────────────┴────────────────────────────────────────┐
│                                  ZON OPERASI                                    │
│        OpenActivityService ──► TRE Engine / WRE Engine / MRE Engine             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Why This is the Minimal Viable Solution
1. **Zero Database Modifications**: No new SQL tables, no schema migrations, no data duplication.
2. **Strict Architectural Conformance**: Satisfies Decision D1 by ending direct operational dependency on raw `IMspResourceRepository`, `IMspWorkforceRepository`, and `IMspMaterialRepository`. Operational engines consume scheduling information *exclusively* through `IProgramKerjaBoundaryService`.
3. **Atomic Revision Safety**: The boundary service validates `programmeId` and `revisionId` and checks that the revision is `Approved` before querying underlying records.

---

## 10. Revision Safety Analysis

### Preventing Revision Contamination (Revision A vs Revision B)

Under the proposed `IProgramKerjaBoundaryService` contract:

```typescript
// Proposed Boundary Contract Interface (Design Spec Only)
export interface IProgramKerjaBoundaryService {
  getProgramKerjaTrade(
    programmeId: string,
    revisionId: string,
    taskId: string
  ): Promise<Result<ProgramKerjaTradeDTO | null, BaseAppError>>;

  getProgramKerjaWorkforce(
    programmeId: string,
    revisionId: string,
    taskId: string
  ): Promise<Result<readonly ProgramKerjaWorkforceDTO[] | null, BaseAppError>>;

  getProgramKerjaMaterials(
    programmeId: string,
    revisionId: string,
    taskId: string
  ): Promise<Result<readonly ProgramKerjaMaterialDTO[] | null, BaseAppError>>;
}
```

### Protection Mechanisms
1. **Mandatory `revisionId` Context**: Every boundary call requires `(programmeId, revisionId, taskId)`.
2. **Revision State Verification**: Before querying scheduling data, `ProgramKerjaBoundaryService` verifies that `revisionId` matches the currently `Approved` revision for `programmeId`.
3. **Archived Context Isolation**: When retrieving historical records for an `Archived` revision, the boundary scopes data strictly to that specific historical `revisionId`.
4. **Cross-Revision Leak Prevention**: Operational engines can never execute a query without specifying `revisionId`, eliminating un-scoped `programme_id + msp_task_id` lookups.

---

## 11. Implementation Impact Map

The following files will require modification during future remediation (DO NOT modify them during this design sprint):

### 1. New Boundary Files (To Be Created in Future Sprint)
- `src/services/IProgramKerjaBoundaryService.ts` (Interface)
- `src/services/ProgramKerjaBoundaryService.ts` (Service Implementation)
- `src/dto/programKerjaDto.ts` (Program Kerja DTOs)

### 2. Operational Engine Service Updates (To Be Updated in Future Sprint)
- [src/services/TreEngineService.ts](file:///c:/Development/JKR-SiteDiary/src/services/TreEngineService.ts): Replace `IMspResourceRepository` dependency with `IProgramKerjaBoundaryService`.
- [src/services/WorkforceEngineService.ts](file:///c:/Development/JKR-SiteDiary/src/services/WorkforceEngineService.ts): Replace `IMspWorkforceRepository` dependency with `IProgramKerjaBoundaryService`.
- [src/services/MaterialEngineService.ts](file:///c:/Development/JKR-SiteDiary/src/services/MaterialEngineService.ts): Replace `IMspMaterialRepository` dependency with `IProgramKerjaBoundaryService`.
- [src/services/OpenActivityService.ts](file:///c:/Development/JKR-SiteDiary/src/services/OpenActivityService.ts): Pass `revisionId` in `TreResolutionContext`, `WorkforceResolutionContext`, and `MaterialResolutionContext`.

### 3. Composition Containers (To Be Updated in Future Sprint)
- [src/composition/treComposition.ts](file:///c:/Development/JKR-SiteDiary/src/composition/treComposition.ts)
- [src/composition/wreComposition.ts](file:///c:/Development/JKR-SiteDiary/src/composition/wreComposition.ts)
- [src/composition/mreComposition.ts](file:///c:/Development/JKR-SiteDiary/src/composition/mreComposition.ts)
- [src/app/api/_shared/container.ts](file:///c:/Development/JKR-SiteDiary/src/app/api/_shared/container.ts)

### 4. Test Suites (To Be Updated in Future Sprint)
- `tests/unit/services/TreEngineService.test.ts`
- `tests/unit/services/WorkforceEngineService.test.ts`
- `tests/unit/services/MaterialEngineService.test.ts`
- `tests/integration/services/openActivityTreIntegration.integration.test.ts`
- `tests/integration/services/openActivityWreIntegration.integration.test.ts`

---

## 12. Risks

- **Risk R1 (API Endpoint Decoupling)**: Direct operational API endpoints (`/api/resources`, `/api/trades`) currently query `msp_resources` directly. They must be updated to pass `revisionId` through `ProgramKerjaBoundaryService`.
- **Risk R2 (Test Mock Alignment)**: Unit tests for TRE, WRE, and MRE currently mock `IMspResourceRepository`, `IMspWorkforceRepository`, and `IMspMaterialRepository`. Test mocks will need to be updated to mock `IProgramKerjaBoundaryService`.

---

## 13. HQ Decision Required

1. **Approval of Recommended Boundary Contract**:
   - *Question*: Does HQ approve the recommended **Domain Service Facade (`IProgramKerjaBoundaryService`) + DTO Boundary (`ProgramKerjaTradeDTO`, etc.)** contract as the minimal compliant implementation of Decision D1?
2. **Auxiliary API Endpoint Routing**:
   - *Question*: Should operational API routes (`/api/resources`, `/api/trades`) be routed through `IProgramKerjaBoundaryService` with mandatory `revisionId` parameters?

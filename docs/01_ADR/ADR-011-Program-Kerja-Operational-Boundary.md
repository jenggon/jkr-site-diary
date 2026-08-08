# ADR-011: Program Kerja Operational Boundary Contract

* **Status**: Accepted
* **Decider**: HQ / Chief Architect
* **Date**: 2026-08-09
* **Decision**: Decision D1 (Program Kerja Operational Boundary)

## Context

During `AUDIT-002 Architecture Conformance`, it was identified that operational engines (Trade Recommendation Engine TRE, Workforce Engine WRE, Material Recommendation Engine MRE) directly queried raw Microsoft Project (MSP) scheduling tables (`msp_resources`, `msp_assignments`, `msp_materials`).

This violated bounded context principles defined in ADR-001 and ADR-002, which establish *Program Kerja* as the official published boundary between *Zon Penjadualan* (Planning Domain) and *Zon Operasi* (Operational Domain).

## Decision

HQ issued locked decision **D1**:

> *"Operational engines shall not bypass the Program Kerja boundary to consume raw MSP scheduling data directly. Operational engines shall consume scheduling-derived information through the active, approved Program Kerja."*

To enforce D1 without adding structural database complexity or data duplication, the platform implements **Recommendation A + B** from AUDIT-002R:

1. **Domain Facade (`IProgramKerjaBoundaryService`)**: A domain service facade in *Zon Penjadualan* that encapsulates scheduling read operations on behalf of *Zon Operasi*.
2. **Explicit DTO Contracts (`ProgramKerjaTradeDTO`, `ProgramKerjaWorkforceDTO`, `ProgramKerjaMaterialDTO`)**: Strongly typed data transfer objects in `src/dto/programKerjaDto.ts` that expose only scheduling-derived information required by operational engines.

## Architectural Rules & Invariants

1. **MSP Remains Planning Authority**: MSP integration tables (`msp_tasks`, `msp_resources`, `msp_assignments`, `msp_materials`) remain the authoritative planning source. No MSP data tables are duplicated.
2. **Zero Direct MSP Dependencies in Zon Operasi**: Operational engine services (`TreEngineService`, `WorkforceEngineService`, `MaterialEngineService`) shall NOT import or inject `MspResourceRepository`, `MspWorkforceRepository`, `IMspMaterialRepository`, or raw Supabase database clients.
3. **Mandatory Revision Safety**:
   - Every boundary resolution request requires explicit `programmeId`, `revisionId`, and `taskId`.
   - `ProgramKerjaBoundaryService` verifies that `revisionId` exists, belongs to `programmeId`, and holds an `'Approved'` status.
   - Requests targeting `Draft` or `Archived` revisions are rejected safely at the boundary.

## Dependency Direction

```text
Zon Operasi (TRE / WRE / MRE)
        │
        ▼
ProgramKerja DTO Contracts (src/dto/programKerjaDto.ts)
        │
        ▼
ProgramKerjaBoundaryService (src/services/ProgramKerjaBoundaryService.ts)
        │
        ▼
Zon Penjadualan / MSP Repositories (msp_resources, msp_assignments, msp_materials)
```

## Consequences

- Operational engines are completely decoupled from raw MSP database schemas and repository classes.
- Operational resolutions enforce active approved revision scoping atomically, eliminating cross-revision data leak vulnerabilities.
- Zero database migrations or new SQL tables were required to achieve full boundary compliance.

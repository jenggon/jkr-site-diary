# Engine Dependency Matrix

**Project:** JKR Site Diary Platform
**Version:** 1.0.0
**Status:** Draft
**Date:** 2026-08-02

---

# Purpose

Represent the current frozen architecture engine dependencies.

This matrix documents which engines depend on which other engines.

It does not redesign the architecture.

---

# Bounded Context Overview

```
Zon Penjadualan                          Zon Operasi
─────────────────────────                ────────────────────────────────────
Programme Engine                         Activity Engine
    │                                        │
MSP Engine                               Site Diary Engine
    │                                        │
Programme Builder ──── Program Kerja ──► Activity Engine
    │                       (boundary)       │
Task Engine                              Progress Engine
                                         Workforce Engine
                                         Knowledge Engine
                                         Approval Engine
                                         Audit Engine
```

---

# Dependency Matrix

A `●` indicates the row engine depends on the column engine.

| Engine | PE | ME | PB | TE | AE | SD | PG | WF | KE | AP | AU |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Programme Engine (PE) | — | | | | | | | | | | |
| MSP Engine (ME) | ● | — | | | | | | | | | |
| Programme Builder (PB) | ● | ● | — | | | | | | | | |
| Task Engine (TE) | | | ● | — | | | | | | | |
| Activity Engine (AE) | | | | ●¹ | — | | | | | | |
| Site Diary Engine (SD) | | | | | ● | — | | | | | |
| Progress Engine (PG) | | | | | ● | ● | — | | | | |
| Workforce Engine (WF) | | | | | ● | ● | | — | ● | | |
| Knowledge Engine (KE) | | | | | | ●² | | | — | | |
| Approval Engine (AP) | | | | | ● | ● | | | | — | |
| Audit Engine (AU) | | | | | ● | ● | ● | ● | | ● | — |

¹ Activity Engine receives Tasks via the Program Kerja boundary. It does not directly couple to Task Engine.  
² Knowledge Engine reads historical Site Diary records only.

---

# Dependency Descriptions

## Zon Penjadualan Dependencies

### MSP Engine → Programme Engine

MSP Engine creates Programme Revisions which belong to a Programme.

Programme Engine must exist before MSP Engine can associate revisions.

---

### Programme Builder → Programme Engine

Programme Builder reads the approved Programme and its metadata.

Programme identity is required to generate a valid Program Kerja.

---

### Programme Builder → MSP Engine

Programme Builder reads the approved Programme Revision produced by MSP Engine.

The Task Structure and UID Mapping produced by MSP Engine are required inputs.

---

### Task Engine → Programme Builder

Task Engine generates executable Tasks from the Program Kerja produced by Programme Builder.

Task Engine cannot operate without an available Program Kerja.

---

## Boundary

### Activity Engine → Task Engine (via Program Kerja)

Activity Engine does not couple directly to Task Engine.

The Program Kerja published by Programme Builder is the only integration point.

This boundary enforces the separation between Zon Penjadualan and Zon Operasi.

Architectural authority: ADR-002, ADR-006.

---

## Zon Operasi Dependencies

### Site Diary Engine → Activity Engine

Site Diary records belong to an Activity.

Activity Engine must exist before Site Diary records can be created.

---

### Progress Engine → Activity Engine, Site Diary Engine

Progress Engine calculates operational progress from Activity status and Site Diary work records.

Both Activity identity and Site Diary records are required inputs.

---

### Workforce Engine → Activity Engine, Site Diary Engine, Knowledge Engine

Workforce Engine records manpower for a Site Diary entry linked to an Activity.

Knowledge Engine provides trade suggestions based on historical Site Diary analysis.

---

### Knowledge Engine → Site Diary Engine

Knowledge Engine reads historical Site Diary records to produce ranked trade suggestions.

It does not modify Site Diary records.

Ranking factors: Same Activity (AHI), Same Subtask, Frequency, Recency.

---

### Approval Engine → Activity Engine, Site Diary Engine

Approval workflow operates on Site Diary records associated with Activities.

Both Activity and Site Diary references are required.

---

### Audit Engine → Activity Engine, Site Diary Engine, Progress Engine, Workforce Engine, Approval Engine

Audit Engine records events across all operational engines.

It depends on all Zon Operasi engines as event sources.

Audit records are append-only and immutable. Architectural authority: ADR-007.

---

# Circular Dependency Policy

No circular dependencies are permitted between engines.

If an implementation creates a circular dependency, an ADR is required before implementation proceeds.

---

# Cross-Boundary Rule

Direct dependencies from Zon Operasi engines to Zon Penjadualan engines are prohibited.

Program Kerja is the only permitted integration point between bounded contexts.

Architectural authority: ADR-001, ADR-002.

---

# Notes

1. Programme Engine has no upstream dependencies. It is the root engine of Zon Penjadualan.
2. Audit Engine has the most downstream dependencies. It is the terminal engine of Zon Operasi.
3. Knowledge Engine is a sub-component of Workforce Engine (WF-004) but is listed separately for clarity.
4. This matrix represents the Architecture Baseline as of Blueprint v1.0 (2026-08-02).

# AD-001: Domain Map

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

Status: Locked

## Purpose

Illustrate the high-level domain boundaries of the JKR Site Diary Platform.

## Domain Map

```mermaid
flowchart LR

subgraph ZP["Zon Penjadualan"]
    P[Programme]
    PR[Programme Revision]
    MSP[MSP Import]
    PB[Programme Builder]
end

subgraph ZO["Zon Operasi"]
    PK[Program Kerja]
    T[Task]
    A[Activity]
    SD[Site Diary]
    PG[Progress]
    WF[Workforce]
end

MSP --> PR
P --> PR
PR --> PB
PB --> PK

PK --> T
T --> A
A --> SD
A --> PG
T --> WF
```

## Notes

- Zon Penjadualan manages planning activities.
- Program Kerja is the operational boundary.
- Zon Operasi executes approved work packages.

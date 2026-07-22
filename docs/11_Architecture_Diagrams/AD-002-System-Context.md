# AD-002: System Context

Status: Active

## Purpose

Describe how external actors interact with the JKR Site Diary Platform.

## Context Diagram

```mermaid
flowchart LR

PM[Project Manager]
SE[Site Engineer]
QS[Quantity Surveyor]
HQ[JKR HQ]
MSP[Microsoft Project]

SYSTEM[JKR Site Diary Platform]

PM --> SYSTEM
SE --> SYSTEM
QS --> SYSTEM

MSP --> SYSTEM

SYSTEM --> HQ
```

## Notes

- Microsoft Project supplies scheduling information.
- HQ receives validated operational information.
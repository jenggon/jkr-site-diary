# AD-004: Component Diagram

Status: Active

## Purpose

Illustrate the internal business components of the JKR Site Diary Platform and their relationships.

## Component Diagram

```mermaid
flowchart LR

subgraph Planning["Zon Penjadualan"]

PE[Programme Engine]
ME[MSP Engine]
TE[Task Engine]

end

subgraph Operation["Zon Operasi"]

AE[Activity Engine]
OAE[Open Activities Engine]
PGE[Progress Engine]
WFE[Workforce Engine]
APE[Approval Engine]
AUE[Audit Engine]

end

subgraph Output

PDF[PDF Engine]
MSPX[MSP Export Engine]
VE[Validation Engine]

end

PE --> ME
ME --> TE

TE --> AE
AE --> OAE

AE --> PGE

TE --> WFE

PGE --> APE

APE --> AUE

PGE --> PDF

PE --> MSPX

PGE --> VE
```

## Notes

- Programme Engine orchestrates planning activities.
- MSP Engine manages Microsoft Project integration.
- Task Engine creates operational work packages.
- Activity Engine records execution.
- Open Activities Engine manages unfinished work across reporting periods.
- Progress Engine consolidates site progress.
- Workforce Engine records manpower allocation.
- Approval Engine validates operational submissions.
- Audit Engine maintains immutable audit records.
- Output Engines generate reports and exports.
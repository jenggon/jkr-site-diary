# AD-010: Engine Relationship

Status: Active

## Purpose

Illustrate relationships among all core engines.

## Engine Relationship

```mermaid
flowchart TB

Programme[Programme Engine]

MSP[MSP Engine]

Task[Task Engine]

Activity[Activity Engine]

Open[Open Activities Engine]

Progress[Progress Engine]

Workforce[Workforce Engine]

Approval[Approval Engine]

Audit[Audit Engine]

Validation[Validation Engine]

PDF[PDF Engine]

Export[MSP Export Engine]

Programme --> MSP

MSP --> Task

Task --> Activity

Activity --> Open

Activity --> Progress

Task --> Workforce

Progress --> Approval

Approval --> Audit

Progress --> Validation

Progress --> PDF

Programme --> Export
```

## Notes

- Programme Engine is the entry point for planning.
- Operational engines execute approved work.
- Output engines generate reports and exports.
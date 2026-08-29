# AD-010 — Engine Relationship

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

```mermaid
flowchart LR

Programme[Programme Engine]

MSP[MSP Engine]

Task[Task Engine]

Activity[Activity Engine]

Progress[Progress Engine]

Workforce[Workforce Engine]

Approval[Approval Engine]

Audit[Audit Engine]

PDF[PDF Engine]

Validation[Validation Engine]

Export[MSP Export Engine]

Programme --> MSP

MSP --> Task

Task --> Activity

Activity --> Progress

Activity --> Workforce

Activity --> Approval

Approval --> Audit

Progress --> PDF

Task --> Export

Validation --> PDF
```

# AD-004 — Component Diagram

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

```mermaid
flowchart TD

ProgrammeEngine[Programme Engine]

MSPEngine[MSP Engine]

TaskEngine[Task Engine]

ActivityEngine[Activity Engine]

ProgressEngine[Progress Engine]

WorkforceEngine[Workforce Engine]

ApprovalEngine[Approval Engine]

AuditEngine[Audit Engine]

ProgrammeEngine --> MSPEngine

MSPEngine --> TaskEngine

TaskEngine --> ActivityEngine

ActivityEngine --> ProgressEngine

ActivityEngine --> WorkforceEngine

ActivityEngine --> ApprovalEngine

ApprovalEngine --> AuditEngine
```

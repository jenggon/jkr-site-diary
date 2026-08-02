# AD-008: Security Boundary

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

Status: Locked

## Purpose

Define security boundaries within the platform.

## Security Boundary

```mermaid
flowchart LR

subgraph Client

USER[Users]

end

subgraph Application

UI[Web UI]

API[Application API]

ENGINES[Business Engines]

end

subgraph Infrastructure

DB[(Supabase)]

FILES[(Storage)]

end

USER --> UI

UI --> API

API --> ENGINES

ENGINES --> DB

ENGINES --> FILES
```

## Notes

- All database access is performed through the Application API.
- Business Engines enforce authorization and validation.

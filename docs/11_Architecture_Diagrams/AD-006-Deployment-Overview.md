# AD-006: Deployment Overview

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

Status: Locked

## Purpose

Illustrate the deployment architecture of the JKR Site Diary Platform.

## Deployment Diagram

```mermaid
flowchart TB

USER[Users]

WEB[Next.js Web Application]

API[Node.js Backend]

DB[(Supabase)]

STORAGE[(Object Storage)]

PDF[PDF Generator]

MSP[MSP Export]

USER --> WEB

WEB --> API

API --> DB

API --> STORAGE

API --> PDF

API --> MSP
```

## Notes

- Users access the system through a web interface.
- Business logic resides in the backend.
- Supabase stores operational data.

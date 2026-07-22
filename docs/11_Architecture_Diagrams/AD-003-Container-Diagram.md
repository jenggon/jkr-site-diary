# AD-003: Container Diagram

Status: Active

## Purpose

Show the major containers of the platform.

## Container Diagram

```mermaid
flowchart TB

UI[Web / Mobile UI]

API[Application API]

ENGINE[Business Engines]

DB[(Supabase Database)]

PDF[PDF Generator]

MSPX[MSP Export]

UI --> API

API --> ENGINE

ENGINE --> DB

ENGINE --> PDF

ENGINE --> MSPX
```

## Notes

Business logic resides within the Business Engines layer.

Persistence is managed by Supabase.
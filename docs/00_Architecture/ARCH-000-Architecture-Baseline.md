# ARCH-000: Architecture Baseline Freeze v1.0

**Project:** JKR Site Diary Platform  
**Version:** 1.0.0 (LOCKED)  
**Status:** Frozen / Active Baseline  
**Date:** 2026-08-02  
**Authority:** HQ Chief Architect  

---

## 1. Purpose

This document establishes the permanent, locked Architecture Baseline for the JKR Site Diary Platform. It defines mandatory software engineering standards, layer responsibilities, dependency direction rules, audit protocols, and governance workflows for all current and future system engines.

Every module, bounded context, and engine built on this platform SHALL strictly comply with this baseline.

---

## 2. Architecture Principles

1. **Clean Architecture:** Strict separation between core business rules, application orchestration, persistence access, and HTTP delivery mechanisms.
2. **Separation of Concerns:** Each layer operates exclusively within its designated scope. No domain logic leaks into delivery layers, and no database logic leaks into domain models.
3. **Single Responsibility Principle (SRP):** Every module, class, service, and repository has a single, well-defined reason to change.
4. **Bounded Context Integrity:** Modules (e.g., Programme Engine, MSP Engine) are isolated domain boundaries communicating strictly through defined domain types and contracts.

---

## 3. Layer Responsibilities

```
Database Schema (PostgreSQL DDL)
     ▲
     │
Domain Model (TypeScript Interfaces/Enums)
     ▲
     │
Repository Layer (Pure Persistence)
     ▲
     │
Service Layer (Business Orchestration & Audit Ownership)
     ▲
     │
REST API Layer (Next.js HTTP Handlers & Payload Validation)
```

- **Database (PostgreSQL DDL):** Defines relational schema, table names, primary keys, foreign keys, unique constraints, and performance indexes. Contains zero business triggers, stored procedures, or seed data.
- **Domain Model (TypeScript Interfaces & Enums):** Defines strict, read-only entity type definitions and enums matching database schemas 1-to-1. Contains zero functions, helper methods, or runtime execution logic.
- **Repository Layer:** Encapsulates low-level database operations (`create`, `read`, `update`) using the database client. Operates strictly as a persistence layer.
- **Service Layer:** Encapsulates business orchestration, lifecycle transitions, status assignments, audit metadata population, and repository coordination.
- **REST API Layer:** Exposes HTTP endpoints (Next.js App Router route handlers), handles request receiving, validates payload parameters, invokes the Service layer, and returns formatted JSON REST responses with proper HTTP status codes.

---

## 4. Dependency Rules

Strict unidirectional dependency flow SHALL be enforced across all engines:

```
REST API Layer
  └── Service Layer
        └── Repository Layer
              └── Database / Domain Models
```

- **Rules:**
  - REST API SHALL ONLY depend on the Service Layer.
  - Service Layer SHALL ONLY depend on the Repository Layer and Domain Models.
  - Repository Layer SHALL ONLY depend on the Database Client and Domain Models.
  - Dependencies SHALL NEVER flow in reverse (e.g., Repository calling Service, or Service calling API).
  - Circular dependencies are strictly prohibited across all files and packages.

---

## 5. Repository Rules

### Repository OWNS:
- Pure data persistence operations (`create`, `read`, `update`).
- Interaction with database client (Supabase / PostgreSQL).
- Object relational mapping between database rows and domain model types.

### Repository NEVER OWNS:
- Business logic or rule validation.
- Lifecycle state transitions or status assignments.
- Audit metadata timestamp generation (`new Date().toISOString()`).
- Infrastructure transaction or RPC orchestration.
- Physical deletion of operational records (where prohibited by Blueprint).

---

## 6. Service Rules

### Service OWNS:
- Business operation orchestration and decision flows.
- Lifecycle state transitions (`ProgrammeLifecycleStatus.Draft`, `Approved`, `Archived`).
- Audit field population (`created_at`, `created_by`, `updated_at`, `updated_by`, `approved_at`, `approved_by`, `archived_at`, `archived_by`).
- Coordination of multiple repository calls.
- ADR-010 technology-agnostic business transaction requirements.

### Service NEVER OWNS:
- Raw SQL queries or direct database client connections.
- HTTP requests, response formatting, or header management.
- Infrastructure-specific implementation logic (e.g., raw RPCs, stored procedures, or database connection pools).

---

## 7. REST API Rules

### REST API OWNS:
- HTTP request parsing and route parameter extraction.
- Payload presence, type, and shape validation.
- Invocation of Service layer operations.
- HTTP status code selection (`200 OK`, `201 Created`, `400 Bad Request`, `404 Not Found`, `500 Internal Server Error`).
- Standardized REST JSON payload formatting (`{ data }` or `{ error }`).

### REST API NEVER OWNS:
- Business rules or domain logic.
- Direct repository invocations.
- Direct database or Supabase client calls.
- Audit field generation or timestamp calculation.

---

## 8. Audit Metadata Ownership

The **Service Layer** is the SOLE OWNER of audit metadata population.

- **Audit Fields Owned by Service:**
  - `created_at`
  - `created_by`
  - `updated_at`
  - `updated_by`
  - `approved_at`
  - `approved_by`
  - `archived_at`
  - `archived_by`

- **Rule:** External callers (REST API, UI, or API consumers) SHALL NEVER calculate or supply audit timestamps (`created_at`, `updated_at`, etc.). The Service layer generates ISO timestamps (`new Date().toISOString()`) prior to persistence.

---

## 9. Audit Workflow & Verdicts

Architectural reviews and integration audits SHALL issue one of three official verdicts:

1. **PASS:**
   - The implementation strictly complies with all locked Blueprint specifications, layer responsibilities, dependency rules, and coding standards. No corrective action required.
2. **PASS WITH OBSERVATION:**
   - The implementation satisfies all functional and architectural requirements, but contains non-blocking notes or deferred milestone items (e.g., pending infrastructure tasks or future parser integrations). Observations are NOT failures and do NOT block progression.
3. **REPAIR REQUIRED:**
   - The implementation violates locked Blueprint rules, layer boundaries, dependency rules, or data contract specifications. Immediate corrective repair is required before proceeding.

---

## 10. Development Workflow

All feature sprints and engine tasks SHALL follow this strict lifecycle:

```
Specification Review
  └── Code Implementation (Migration → Domain Model → Repository → Service → API)
        └── Integration Audit
              └── PASS / PASS WITH OBSERVATION Verdict
                    └── Commit & Tag
                          └── Push to Remote
```

- **Milestone Exception:** An Integration Audit milestone task (e.g., DEV-001F, DEV-002F) is a read-only audit task and does NOT require a git commit or tag unless documentation files are explicitly created or updated as part of the directive.

---

## 11. Naming Conventions

### File & Symbol Naming:
- **Domain Types:** PascalCase interface names (`Programme`, `ProgrammeRevision`, `Task`) placed in `src/types/<entity>.ts`.
- **Repositories:** camelCase file and export names (`programmeRepository`, `taskRepository`) placed in `src/repositories/<entity>Repository.ts`.
- **Services:** camelCase file and export names (`programmeService`, `taskService`) placed in `src/services/<entity>Service.ts`.
- **API Routes:** Next.js App Router standard directory structure placed in `src/app/api/<entity>/route.ts` or `src/app/api/<entity>/[id]/route.ts`.

### Git Commit & Tag Naming:
- **Commit Messages:** `feat(<engine>): <sprint-id> - <short summary>` (e.g., `feat(programme): DEV-001E - Implement REST API Layer`).
- **Tag Format:** `v<version>-<sprint-id>` (e.g., `v1.0.0-DEV-001E`).

---

## 12. Architecture Freeze Statement

> [!IMPORTANT]
> **THIS DOCUMENT IS LOCKED.**
> This Architecture Baseline represents the frozen v1.0 baseline for the JKR Site Diary Platform. No modification, deviation, or architectural redesign is permitted without explicit approval from the HQ Chief Architect.

---

## 13. Engine Implementation Standard

Every Engine SHALL follow the same implementation lifecycle.

The implementation order is mandatory.

No Engine may skip a layer.

No Engine may change the sequence without explicit Chief Architect approval.

### Implementation Lifecycle

```
Database Schema
     ↓
Domain Model
     ↓
Repository
     ↓
Service
     ↓
REST API
     ↓
Integration Audit
```

### Milestone Standard

Each implementation milestone SHALL have:
- Git Commit
- Git Tag
- Architecture Audit

Integration Audit milestones SHALL NOT create additional commits unless project documentation has changed.

### Example Sequence

#### Programme Engine
- `v1.1` Database
- `v1.2` Domain Model
- `v1.3` Repository
- `v1.4` Service
- `v1.5` REST API
- `v1.6` Integration Audit

#### MSP Engine
- `v2.1` Database
- `v2.2` Domain Model
- `v2.3` Repository
- `v2.4` Service
- `v2.5` REST API
- `v2.6` Integration Audit

### Future Engines

Every future engine SHALL follow the same implementation lifecycle.

Examples include:
- Task Engine
- Activity Engine
- Open Activities Engine
- Progress Engine
- Workforce Engine
- Approval Engine
- Audit Engine
- Output Engine

### Architecture Statement

The implementation lifecycle defined above is LOCKED.

All future engines SHALL comply with this standard unless an Architecture Decision Record (ADR) explicitly supersedes it.


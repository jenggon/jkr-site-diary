# HQ ENGINEERING IMPLEMENTATION SPECIFICATION
## DEV-020A — Implementation Roadmap

**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-001 through ADR-010, DEV-001 through DEV-012Z  

---

# 1. Purpose & Objectives

- **Business Objective:** Guide the physical software construction of the JKR Site Diary Platform in strict compliance with the locked Architecture Baseline (**ARCH-000** through **DEV-012Z**).
- **Operational Objective:** Provide engineering leads, developers, and QA teams with a structured, step-by-step implementation sequence across all 11 domain engines.
- **Implementation Objective:** Enforce zero architecture drift, mandatory test coverage, and strict layer isolation during codebase assembly.

---

# 2. Implementation Philosophy

- **Architecture First:** Software construction MUST strictly follow locked architecture specifications; zero ad-hoc design changes.
- **Database First:** Database schema DDL migrations (**DB-001** - **DB-021**) deployed and verified prior to backend entity coding.
- **Domain Driven:** Code structure mirrors domain engine boundaries (Programme, Revision, Task, Activity, Open Activities, Site Diary, Workforce, Progress, Approval, Audit, Carry Forward).
- **Layered Architecture:** Enforce sequence: Database → Domain Types → Repositories → Services → REST APIs → Frontend UI per **ARCH-000**.
- **Incremental Delivery:** Build and test domain engines in dependency order; continuous integration quality gates.
- **Test Driven:** Unit tests for Domain Services and integration tests for Repositories/REST APIs written alongside features.
- **Zero Architecture Drift:** Any deviation from locked specs requires Change Advisory Board (CAB) review and formal ADR amendment.

---

# 3. Implementation Phases

### Phase 0: Repository & Environment Preparation
- **Repository Setup:** Folder structure aligned with `src/types`, `src/repositories`, `src/services`, `src/app/api`, `supabase/migrations`.
- **CI/CD Pipeline:** Automated build, linting, unit test execution, and static security analysis (SAST).
- **Coding Standards:** Enforce strict TypeScript typing (`noImplicitAny: true`), ESLint, and Prettier rules.
- **Branch Strategy:** GitFlow branch model (`main`, `develop`, `feature/*`, `release/*`, `hotfix/*`).

### Phase 1: Database Layer Implementation
- Execute and verify PostgreSQL migration scripts (`20260802141400` through `20260803215000`).
- Validate Primary Keys, Foreign Keys, Indexes, Constraints, and Enums per **DB-021**.
- Seed master reference data (`trade_library`).

### Phase 2: Core Domain Model Implementation
- Construct Domain Model TypeScript interfaces and enums (`src/types/*.ts`) matching **DM-001** - **DM-010** exactly.
- Implement Data Transfer Objects (DTOs) and Value Objects for API payloads.
- Implement pure persistence Repositories (`src/repositories/*.ts`). Zero business logic.

### Phase 3: Business Service Engine Implementation
- Construct Service Layer orchestration (`src/services/*.ts`) for all 11 engines:
  1. Programme Service
  2. Revision Service
  3. Task Service
  4. Activity Service
  5. Open Activities Service
  6. Site Diary Service
  7. Workforce Service
  8. Progress Service
  9. Approval Service
  10. Audit Service
  11. Carry Forward Engine Service

### Phase 4: REST API & Gateway Layer Implementation
- Construct App Router API route handlers (`src/app/api/*`).
- Integrate Ingress Validation (`DEV-012A`), RBAC Authorization (`DEV-012C`), and Standard Error Formatting (`DEV-012D`).

### Phase 5: Frontend & User Portal Construction
- Admin Portal (Programme configuration, Baseline publishing).
- Engineer Portal (Daily Site Diary logging, Workforce entry, Physical Progress recording).
- SO / AE Review Portal (Pending Approval queue, verification, sign-off).
- Offline PWA / Mobile sync module for field engineers.

### Phase 6: Testing & Quality Assurance
- Unit Tests (Domain Services & Validation logic).
- Integration Tests (Repository Supabase access & atomic transactions).
- Contract & API Tests (OpenAPI 3.1 compliance).
- Performance & Load Tests (Ref: DEV-012I).
- User Acceptance Testing (UAT) with JKR Superintending Officers.

### Phase 7: Production Deployment & Go-Live
- Infrastructure provisioning, secrets injection, TLS certificate binding.
- Pre-Production dry-run and Disaster Recovery validation (Ref: DEV-012J).
- Production deployment and nationwide rollout.

---

# 4. Dependency Matrix & Critical Path

```
[ Phase 0: Repo Prep ]
         │
         ▼
[ Phase 1: Database DDL ] ───► [ Phase 2: Domain Types & Repositories ]
                                             │
                                             ▼
                                 [ Phase 3: Domain Services ]
                                             │
                                             ▼
                                 [ Phase 4: REST API Routes ]
                                             │
                                             ▼
                                 [ Phase 5: Frontend Portals ]
                                             │
                                             ▼
                                 [ Phase 6: End-to-End Testing ]
                                             │
                                             ▼
                                 [ Phase 7: Production Release ]
```

- **CRITICAL PATH:** `Phase 1 (DB)` → `Phase 2 (Types/Repos)` → `Phase 3 (Services)` → `Phase 4 (API)` → `Phase 6 (Testing)` → `Phase 7 (Release)`.

---

# 5. Milestone Schedule

- **M0 (Architecture Baseline Complete):** `DEV-001` - `DEV-012Z` Locked. **[ACHIEVED]**
- **M1 (Database Ready):** All DDL migrations executed and verified.
- **M2 (Core Backend Services Complete):** 11 Domain Repositories and Services operational.
- **M3 (API Gateway Operational):** All REST endpoints authenticated, authorized, and validated.
- **M4 (Frontend & Portals Integrated):** Contractor and SO web/mobile interfaces functional.
- **M5 (Testing & Acceptance Complete):** UAT sign-off and load testing targets achieved.
- **M6 (Production Deployment):** Nationwide system go-live.

---

# 6. Definition of Done & Release Readiness

### Implementation Acceptance Checklist:
- [ ] 100% of DDL migrations pass cleanly with zero errors.
- [ ] 100% of Domain Models match specified TypeScript interfaces.
- [ ] Unit test coverage >= 85% for all Service orchestration logic.
- [ ] Zero physical delete queries present in Repository codebase (**DB-007**).
- [ ] Every mutating Service transaction writes an append-only Audit record (**ADR-010**).
- [ ] All API endpoints match DEV-012E envelope and error standards.

---

# 7. Future Expansion

- Microservice extraction for high-traffic engines (Carry Forward, Audit).
- GIS & BIM 3D visual progress rendering integration.
- AI-assisted site progress forecasting and anomaly detection.

---

**IMPLEMENTATION PHASE AUTHORIZED**

---
**END OF SPECIFICATION — DEV-020A**

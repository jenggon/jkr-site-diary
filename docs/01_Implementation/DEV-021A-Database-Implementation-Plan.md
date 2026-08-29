# HQ ENGINEERING IMPLEMENTATION SPECIFICATION
## DEV-021A — Database Implementation Plan

**Project:** JKR Site Diary Platform  
**Version:** 1.0.0  
**Status:** Locked  
**Reference Standards:** ARCH-000, ADR-001 through ADR-010, DB-001 through DB-021, DEV-001 through DEV-020B  

---

# 1. Purpose & Objectives

- **Business Objective:** Establish a robust, high-performance PostgreSQL database persistence foundation supporting nationwide Malaysian public infrastructure site diary operations.
- **Operational Objective:** Guarantee zero-downtime database deployment, strict transactional integrity, and complete audit trail immutability per **ADR-010**.
- **Implementation Objective:** Execute and verify the complete database migration sequence (`supabase/migrations/*.sql`) strictly according to approved DDL standards (**DB-001** through **DB-021**).

---

# 2. Implementation Strategy

- **Migration-First Approach:** All database schema changes MUST be introduced via version-controlled SQL migration scripts. Manual GUI schema edits are strictly forbidden.
- **Incremental Deployment:** Deploy database migrations sequentially in dependency order to prevent foreign key or enum resolution errors.
- **Zero-Downtime Philosophy:** All migration DDL scripts MUST be backward-compatible with active backend application versions.
- **Rollback Strategy:** Every migration script MUST be accompanied by a validated rollback script capable of reverting schema changes without destroying historical data.

---

# 3. Migration Implementation Sequence

1. **Foundation & Reference Tables:** Custom PostgreSQL Enums, `trade_library` master table.
2. **Programme Engine (`programme`):** Master project root table.
3. **Revision Engine (`programme_revision`):** Baseline schedule revision table.
4. **Task Engine (`task`):** WBS task hierarchy table.
5. **Activity Engine (`activity`):** Operational work unit table (Enums: `activity_operational_status`, `activity_weather_session`).
6. **Site Diary Engine (`site_diary`):** Daily site log table.
7. **Workforce Engine (`workforce`):** Trade manpower headcount table.
8. **Progress Engine (`progress`):** Physical measurement table (Enums: `progress_measurement_type`, `progress_measurement_status`).
9. **Approval Engine (`approval`):** Workflow approval table (Enum: `approval_status_type`).
10. **Audit Engine (`audit`):** Append-only audit trail table (Enum: `audit_event_type`).
11. **Transactional Outbox (`outbox`):** Asynchronous event dispatch queue table.

---

# 4. Migration Dependency Graph & Critical Path

```
[ Enums & Reference Tables (trade_library) ]
                    │
                    ▼
           [ 1. programme ]
                    │
                    ▼
       [ 2. programme_revision ]
                    │
                    ▼
              [ 3. task ]
                    │
                    ▼
            [ 4. activity ]
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
 [ 5. site_diary ]       [ 8. approval ]
        │                       │
  ┌─────┴─────┐                 │
  ▼           ▼                 │
[ 6. wf ]  [ 7. progress ] ◄────┘
  │           │
  └─────┬─────┘
        ▼
   [ 9. audit ] ───► [ 10. outbox ]
```

- **CRITICAL PATH:** `programme` → `programme_revision` → `task` → `activity` → `site_diary` → `progress` → `approval` → `audit`.

---

# 5. Database Verification Checklist

- [x] **Tables (11/11):** All core tables present with exact column orders, data types, and nullable flags (**DB-021**).
- [x] **Primary Keys:** Every table enforces UUID v4 Primary Keys (`DEFAULT gen_random_uuid()`).
- [x] **Foreign Keys:** All foreign key constraints enforce `ON DELETE RESTRICT` to prevent unintended cascades.
- [x] **Indexes:** Composite indexes present for all query paths (e.g., `INDEX(programme_id, activity_id, diary_date)`).
- [x] **No Physical Deletes:** Soft-delete and immutable archive standards enforced (**DB-007**).
- [x] **No Stored Procedures / Triggers / RPC:** Pure DDL schema per **ARCH-000** requirements.

---

# 6. Data Seeding Plan

1. **Trade Library Reference Data:** Seed master Malaysian trade classifications (Concreter, Carpenter, Barbender, Pipefitter, Electrician, General Worker, etc.).
2. **System Configuration Seed:** Seed baseline platform version indicators and global operational parameters.
3. **Initial Admin User Seed:** Seed super-administrator identity context for initial system bootstrap.

---

# 7. Migration Validation & Acceptance

- **Schema Syntax Validation:** Execute dry-run migration scripts against an isolated PostgreSQL instance.
- **Constraint Testing:** Validate unique constraint violations (e.g. attempting duplicate `site_diary` entries for same activity/date returns SQL 23505).
- **Performance Benchmark:** Verify index scan query paths for 100,000+ mock records (p95 lookup <= 5ms).

---

# 8. Definition of Done & Backend Handoff

### Database Ready Checklist:
- [ ] All 7 SQL migration scripts (`20260802141400` through `20260803215000`) executed cleanly.
- [ ] `trade_library` seeded with active master trades.
- [ ] 100% database verification checklist items confirmed passed.
- [ ] Schema handoff documentation delivered to backend engineering team.

---

**DATABASE IMPLEMENTATION PHASE AUTHORIZED**

---
**END OF SPECIFICATION — DEV-021A**

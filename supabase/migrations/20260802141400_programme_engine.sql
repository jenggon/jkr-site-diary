-- ============================================================
-- Migration: Programme Engine
-- Sprint: DEV-001A
-- Date: 2026-08-02
-- Spec: DB-011 (programme), DB-012 (programme_revision)
-- Owner: Programme Engine (Zon Penjadualan)
--
-- Creates the two tables that form the Programme Engine:
--   programme             — root aggregate (DB-011)
--   programme_revision    — versioned planning baseline (DB-012)
--
-- Circular FK note:
--   programme.current_revision_id → programme_revision.revision_id
--   programme_revision.programme_id → programme.programme_id
--
--   Resolved by:
--   1. Creating programme first (current_revision_id nullable, no FK yet)
--   2. Creating programme_revision with FK to programme
--   3. Adding FK programme.current_revision_id → programme_revision
-- ============================================================

-- ============================================================
-- Enum: programme_lifecycle_status
-- Shared lifecycle states for programme and programme_revision
-- ADR-004, DB-011, DB-012
-- ============================================================

CREATE TYPE "public"."programme_lifecycle_status" AS ENUM (
    'Draft',
    'Approved',
    'Archived'
);

-- ============================================================
-- Table: programme
-- Spec: DB-011
-- Owner: Programme Engine
-- Root aggregate of the entire platform (ADR-009)
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."programme" (
    "programme_id"             uuid                                  NOT NULL DEFAULT gen_random_uuid(),
    "programme_code"           character varying(50)                 NOT NULL,
    "programme_name"           text                                  NOT NULL,
    "employer_name"            text,
    "contractor_name"          text,
    "supervising_officer"      text,
    "contract_start_date"      date,
    "contract_completion_date" date,
    "defect_liability_end"     date,
    "current_revision_id"      uuid,
    "status"                   "public"."programme_lifecycle_status" NOT NULL DEFAULT 'Draft',
    "created_at"               timestamp with time zone              NOT NULL DEFAULT now(),
    "created_by"               uuid                                  NOT NULL,
    "updated_at"               timestamp with time zone,
    "updated_by"               uuid,
    "archived_at"              timestamp with time zone,
    "archived_by"              uuid
);

-- ============================================================
-- Table: programme_revision
-- Spec: DB-012
-- Owner: Programme Engine
-- Versioned planning baseline imported from MSP
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."programme_revision" (
    "revision_id"      uuid                                  NOT NULL DEFAULT gen_random_uuid(),
    "programme_id"     uuid                                  NOT NULL,
    "revision_no"      integer                               NOT NULL,
    "revision_name"    character varying(100),
    "msp_file_name"    text,
    "msp_imported_at"  timestamp with time zone,
    "msp_imported_by"  uuid,
    "baseline_date"    date,
    "approval_date"    date,
    "effective_date"   date,
    "status"           "public"."programme_lifecycle_status" NOT NULL DEFAULT 'Draft',
    "created_at"       timestamp with time zone              NOT NULL DEFAULT now(),
    "created_by"       uuid                                  NOT NULL,
    "approved_at"      timestamp with time zone,
    "approved_by"      uuid,
    "archived_at"      timestamp with time zone,
    "archived_by"      uuid
);

-- ============================================================
-- Primary Keys
-- DB-004: Every entity shall have exactly one Primary Key
-- ============================================================

ALTER TABLE ONLY "public"."programme"
    ADD CONSTRAINT "programme_pkey" PRIMARY KEY ("programme_id");

ALTER TABLE ONLY "public"."programme_revision"
    ADD CONSTRAINT "programme_revision_pkey" PRIMARY KEY ("revision_id");

-- ============================================================
-- Unique Constraints
-- DB-011: programme_code must be unique
-- DB-012: (programme_id, revision_no) must be unique per programme
-- ============================================================

ALTER TABLE ONLY "public"."programme"
    ADD CONSTRAINT "programme_programme_code_key" UNIQUE ("programme_code");

ALTER TABLE ONLY "public"."programme_revision"
    ADD CONSTRAINT "programme_revision_programme_id_revision_no_key"
    UNIQUE ("programme_id", "revision_no");

-- ============================================================
-- Foreign Keys
-- DB-005: Every reference shall be validated
-- ============================================================

-- programme_revision.programme_id → programme.programme_id
-- Every revision belongs to exactly one programme (DB-012)
ALTER TABLE ONLY "public"."programme_revision"
    ADD CONSTRAINT "programme_revision_programme_id_fkey"
    FOREIGN KEY ("programme_id")
    REFERENCES "public"."programme" ("programme_id");

-- programme.current_revision_id → programme_revision.revision_id
-- Identifies the single active revision for a programme (DB-011)
-- Added after programme_revision exists to resolve circular dependency
-- Nullable: a programme may exist before any revision is created
ALTER TABLE ONLY "public"."programme"
    ADD CONSTRAINT "programme_current_revision_id_fkey"
    FOREIGN KEY ("current_revision_id")
    REFERENCES "public"."programme_revision" ("revision_id");

-- ============================================================
-- Indexes
-- DB-008: Improve query performance
-- ============================================================

-- programme: status filter (find active/archived programmes)
CREATE INDEX "idx_programme_status"
    ON "public"."programme" USING btree ("status");

-- programme: current revision pointer lookup
CREATE INDEX "idx_programme_current_revision_id"
    ON "public"."programme" USING btree ("current_revision_id");

-- programme_revision: parent programme lookup
CREATE INDEX "idx_programme_revision_programme_id"
    ON "public"."programme_revision" USING btree ("programme_id");

-- programme_revision: composite index for revision identity queries
-- Covers (programme_id, revision_no) unique constraint queries
CREATE INDEX "idx_programme_revision_programme_id_revision_no"
    ON "public"."programme_revision" USING btree ("programme_id", "revision_no");

-- programme_revision: status filter (find the single Approved revision per programme)
CREATE INDEX "idx_programme_revision_status"
    ON "public"."programme_revision" USING btree ("status");

-- programme_revision: effective date for operational transition queries
CREATE INDEX "idx_programme_revision_effective_date"
    ON "public"."programme_revision" USING btree ("effective_date");

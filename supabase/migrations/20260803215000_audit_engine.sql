-- ============================================================
-- Migration: Audit Engine
-- Sprint: DEV-009B
-- Date: 2026-08-03
-- Spec: DB-021 (audit)
-- Owner: Audit Engine (Zon Operasi)
--
-- Creates the audit table that forms the Audit Engine persistence model:
--   audit — immutable history of all significant system events (DB-021)
-- ============================================================

-- ============================================================
-- Enum: audit_event_type
-- Spec: DB-021
-- ============================================================

CREATE TYPE "public"."audit_event_type" AS ENUM (
    'Create',
    'Update',
    'Delete Attempt',
    'Archive',
    'Approve',
    'Reject',
    'Resume',
    'Carry Forward',
    'Complete',
    'Import',
    'Export',
    'Login',
    'Logout'
);

-- ============================================================
-- Table: audit
-- Spec: DB-021
-- Owner: Audit Engine
-- Immutable history of all system events (AU-001, AU-002, AU-004)
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."audit" (
    "audit_id"            uuid                       NOT NULL DEFAULT gen_random_uuid(),
    "programme_id"        uuid                       NOT NULL,
    "revision_id"         uuid,
    "entity_name"         character varying(100)     NOT NULL,
    "entity_id"           uuid                       NOT NULL,
    "event_type"          "public"."audit_event_type" NOT NULL,
    "event_timestamp"     timestamp with time zone   NOT NULL DEFAULT now(),
    "performed_by"        uuid                       NOT NULL,
    "user_role"           character varying(100),
    "field_name"          character varying(100),
    "old_value"           text,
    "new_value"           text,
    "change_reason"       text,
    "ip_address"          character varying(50),
    "device_information"  text,
    "application_version" character varying(30)
);

-- ============================================================
-- Primary Key
-- DB-004: Every entity shall have exactly one Primary Key
-- DB-021: Primary Key is audit_id
-- ============================================================

ALTER TABLE ONLY "public"."audit"
    ADD CONSTRAINT "audit_pkey" PRIMARY KEY ("audit_id");

-- ============================================================
-- Foreign Keys
-- DB-005: Every reference shall be validated
-- DB-021: Audit belongs to Programme and optional Programme Revision
-- ============================================================

-- audit.programme_id → programme.programme_id
ALTER TABLE ONLY "public"."audit"
    ADD CONSTRAINT "audit_programme_id_fkey"
    FOREIGN KEY ("programme_id")
    REFERENCES "public"."programme" ("programme_id");

-- audit.revision_id → programme_revision.revision_id
ALTER TABLE ONLY "public"."audit"
    ADD CONSTRAINT "audit_revision_id_fkey"
    FOREIGN KEY ("revision_id")
    REFERENCES "public"."programme_revision" ("revision_id");

-- ============================================================
-- Indexes
-- DB-008: Improve query performance
-- DB-021: Required Indexes
-- ============================================================

-- audit: parent programme lookup
CREATE INDEX "idx_audit_programme_id"
    ON "public"."audit" USING btree ("programme_id");

-- audit: parent revision lookup
CREATE INDEX "idx_audit_revision_id"
    ON "public"."audit" USING btree ("revision_id");

-- audit: composite index for entity reference lookup
CREATE INDEX "idx_audit_entity_name_entity_id"
    ON "public"."audit" USING btree ("entity_name", "entity_id");

-- audit: composite index for programme timeline lookup
CREATE INDEX "idx_audit_programme_id_event_timestamp"
    ON "public"."audit" USING btree ("programme_id", "event_timestamp");

-- audit: actor lookup index
CREATE INDEX "idx_audit_performed_by"
    ON "public"."audit" USING btree ("performed_by");

-- audit: event type filter index
CREATE INDEX "idx_audit_event_type"
    ON "public"."audit" USING btree ("event_type");

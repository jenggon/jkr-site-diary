-- ============================================================
-- Migration: Open Activities / Progress Engine
-- Sprint: DEV-006A
-- Date: 2026-08-02
-- Spec: DB-016 (progress)
-- Owner: Progress Engine / Open Activities Engine (Zon Operasi)
--
-- Creates the progress table that forms the Progress Engine persistence model:
--   progress — measured achievement of an Activity (DB-016)
-- ============================================================

-- ============================================================
-- Enums: progress_measurement_type & progress_measurement_status
-- Spec: DB-016
-- ============================================================

CREATE TYPE "public"."progress_measurement_type" AS ENUM (
    'Percentage',
    'Quantity',
    'Length',
    'Area',
    'Volume',
    'Weight',
    'Item'
);

CREATE TYPE "public"."progress_measurement_status" AS ENUM (
    'Draft',
    'Verified',
    'Approved'
);

-- ============================================================
-- Table: progress
-- Spec: DB-016
-- Owner: Progress Engine / Open Activities Engine
-- Measured achievement of an Activity (PG-001, PG-002)
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."progress" (
    "progress_id"          uuid                                   NOT NULL DEFAULT gen_random_uuid(),
    "programme_id"         uuid                                   NOT NULL,
    "revision_id"          uuid                                   NOT NULL,
    "activity_id"          uuid                                   NOT NULL,
    "site_diary_id"        uuid                                   NOT NULL,
    "measurement_date"     date                                   NOT NULL,
    "progress_type"        "public"."progress_measurement_type",
    "planned_quantity"     numeric(18,4),
    "actual_quantity"      numeric(18,4)                          NOT NULL,
    "unit"                 character varying(20),
    "progress_percentage"  numeric(5,2),
    "measurement_status"   "public"."progress_measurement_status" NOT NULL DEFAULT 'Draft',
    "verified_by"          uuid,
    "verified_at"          timestamp with time zone,
    "approved_by"          uuid,
    "approved_at"          timestamp with time zone,
    "created_at"           timestamp with time zone               NOT NULL DEFAULT now(),
    "updated_at"           timestamp with time zone
);

-- ============================================================
-- Primary Key
-- DB-004: Every entity shall have exactly one Primary Key
-- DB-016: Primary Key is progress_id
-- ============================================================

ALTER TABLE ONLY "public"."progress"
    ADD CONSTRAINT "progress_pkey" PRIMARY KEY ("progress_id");

-- ============================================================
-- Foreign Keys
-- DB-005: Every reference shall be validated
-- DB-016: Progress belongs to Programme, Revision, Activity, and Site Diary
-- ============================================================

-- progress.programme_id → programme.programme_id
ALTER TABLE ONLY "public"."progress"
    ADD CONSTRAINT "progress_programme_id_fkey"
    FOREIGN KEY ("programme_id")
    REFERENCES "public"."programme" ("programme_id");

-- progress.revision_id → programme_revision.revision_id
ALTER TABLE ONLY "public"."progress"
    ADD CONSTRAINT "progress_revision_id_fkey"
    FOREIGN KEY ("revision_id")
    REFERENCES "public"."programme_revision" ("revision_id");

-- progress.activity_id → activity.activity_id
ALTER TABLE ONLY "public"."progress"
    ADD CONSTRAINT "progress_activity_id_fkey"
    FOREIGN KEY ("activity_id")
    REFERENCES "public"."activity" ("activity_id");

-- progress.site_diary_id → site_diary.site_diary_id
ALTER TABLE ONLY "public"."progress"
    ADD CONSTRAINT "progress_site_diary_id_fkey"
    FOREIGN KEY ("site_diary_id")
    REFERENCES "public"."site_diary" ("site_diary_id");

-- ============================================================
-- Indexes
-- DB-008: Improve query performance
-- DB-016: Required Indexes
-- ============================================================

-- progress: parent programme lookup
CREATE INDEX "idx_progress_programme_id"
    ON "public"."progress" USING btree ("programme_id");

-- progress: parent revision lookup
CREATE INDEX "idx_progress_revision_id"
    ON "public"."progress" USING btree ("revision_id");

-- progress: parent activity lookup
CREATE INDEX "idx_progress_activity_id"
    ON "public"."progress" USING btree ("activity_id");

-- progress: parent site diary lookup
CREATE INDEX "idx_progress_site_diary_id"
    ON "public"."progress" USING btree ("site_diary_id");

-- progress: composite index for activity and measurement date lookup
CREATE INDEX "idx_progress_activity_id_measurement_date"
    ON "public"."progress" USING btree ("activity_id", "measurement_date");

-- progress: composite index for site diary and measurement date lookup
CREATE INDEX "idx_progress_site_diary_id_measurement_date"
    ON "public"."progress" USING btree ("site_diary_id", "measurement_date");

-- progress: status filtering index
CREATE INDEX "idx_progress_measurement_status"
    ON "public"."progress" USING btree ("measurement_status");

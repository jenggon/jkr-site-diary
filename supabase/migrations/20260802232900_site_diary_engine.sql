-- ============================================================
-- Migration: Open Activities / Site Diary Engine
-- Sprint: DEV-005A
-- Date: 2026-08-02
-- Spec: DB-015 (site_diary)
-- Owner: Operation Engine / Site Diary Engine (Zon Operasi)
--
-- Creates the site_diary table that forms the Site Diary persistence model:
--   site_diary — daily execution log for an Activity (DB-015)
-- ============================================================

-- ============================================================
-- Table: site_diary
-- Spec: DB-015
-- Owner: Operation Engine / Site Diary Engine
-- Daily execution record for an Activity (SD-001, SD-002)
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."site_diary" (
    "site_diary_id" uuid                     NOT NULL DEFAULT gen_random_uuid(),
    "programme_id"  uuid                     NOT NULL,
    "revision_id"   uuid                     NOT NULL,
    "activity_id"   uuid                     NOT NULL,
    "activity_date" date                     NOT NULL,
    "weather"       "public"."activity_weather_session",
    "notes"         text                     NOT NULL,
    "status"        "public"."activity_operational_status",
    "manpower"      jsonb,
    "submitted_by"  uuid                     NOT NULL,
    "submitted_at"  timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at"    timestamp with time zone
);

-- ============================================================
-- Primary Key
-- DB-004: Every entity shall have exactly one Primary Key
-- DB-015: Primary Key is site_diary_id
-- ============================================================

ALTER TABLE ONLY "public"."site_diary"
    ADD CONSTRAINT "site_diary_pkey" PRIMARY KEY ("site_diary_id");

-- ============================================================
-- Unique Constraints
-- DB-015: One Site Diary record represents one Activity on one date (activity_id, activity_date)
-- ============================================================

ALTER TABLE ONLY "public"."site_diary"
    ADD CONSTRAINT "site_diary_activity_id_activity_date_key"
    UNIQUE ("activity_id", "activity_date");

-- ============================================================
-- Foreign Keys
-- DB-005: Every reference shall be validated
-- DB-015: Site Diary belongs to Programme, Revision, and Activity
-- ============================================================

-- site_diary.programme_id → programme.programme_id
ALTER TABLE ONLY "public"."site_diary"
    ADD CONSTRAINT "site_diary_programme_id_fkey"
    FOREIGN KEY ("programme_id")
    REFERENCES "public"."programme" ("programme_id");

-- site_diary.revision_id → programme_revision.revision_id
ALTER TABLE ONLY "public"."site_diary"
    ADD CONSTRAINT "site_diary_revision_id_fkey"
    FOREIGN KEY ("revision_id")
    REFERENCES "public"."programme_revision" ("revision_id");

-- site_diary.activity_id → activity.activity_id
ALTER TABLE ONLY "public"."site_diary"
    ADD CONSTRAINT "site_diary_activity_id_fkey"
    FOREIGN KEY ("activity_id")
    REFERENCES "public"."activity" ("activity_id");

-- ============================================================
-- Indexes
-- DB-008: Improve query performance
-- DB-015: Required Indexes
-- ============================================================

-- site_diary: parent programme lookup
CREATE INDEX "idx_site_diary_programme_id"
    ON "public"."site_diary" USING btree ("programme_id");

-- site_diary: parent revision lookup
CREATE INDEX "idx_site_diary_revision_id"
    ON "public"."site_diary" USING btree ("revision_id");

-- site_diary: parent activity lookup
CREATE INDEX "idx_site_diary_activity_id"
    ON "public"."site_diary" USING btree ("activity_id");

-- site_diary: composite index for activity and date unique lookup
CREATE INDEX "idx_site_diary_activity_id_activity_date"
    ON "public"."site_diary" USING btree ("activity_id", "activity_date");

-- site_diary: submitter filter index
CREATE INDEX "idx_site_diary_submitted_by"
    ON "public"."site_diary" USING btree ("submitted_by");

-- site_diary: activity date filter index
CREATE INDEX "idx_site_diary_activity_date"
    ON "public"."site_diary" USING btree ("activity_date");

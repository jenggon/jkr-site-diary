-- ============================================================
-- Migration: Activity Engine
-- Sprint: DEV-004A
-- Date: 2026-08-02
-- Spec: DB-014 (activity)
-- Owner: Activity Engine (Zon Operasi)
--
-- Creates the activity table that forms the Activity Engine persistence model:
--   activity — operational execution of a published Task (DB-014)
-- ============================================================

-- ============================================================
-- Enums: activity_operational_status & activity_weather_session
-- Spec: DB-014
-- ============================================================

CREATE TYPE "public"."activity_operational_status" AS ENUM (
    'New',
    'In Progress',
    'Completed'
);

CREATE TYPE "public"."activity_weather_session" AS ENUM (
    'Morning',
    'Afternoon',
    'Night'
);

-- ============================================================
-- Table: activity
-- Spec: DB-014
-- Owner: Activity Engine
-- Operational execution of a published Task (AE-001, AE-002)
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."activity" (
    "activity_id"          uuid                                      NOT NULL DEFAULT gen_random_uuid(),
    "programme_id"         uuid                                      NOT NULL,
    "revision_id"          uuid                                      NOT NULL,
    "task_id"              uuid                                      NOT NULL,
    "activity_uid"         uuid                                      NOT NULL DEFAULT gen_random_uuid(),
    "ahi"                  character varying(100),
    "ahi_display_name"     text,
    "subtask"              character varying(100)                    NOT NULL,
    "subtask_display_name" text,
    "activity_date"        date                                      NOT NULL,
    "actual_start_date"    date,
    "completed_date"       date,
    "status"               "public"."activity_operational_status"    NOT NULL DEFAULT 'New',
    "weather"              "public"."activity_weather_session",
    "notes"                text                                      NOT NULL,
    "submitted_by"         uuid                                      NOT NULL,
    "created_at"           timestamp with time zone                  NOT NULL DEFAULT now(),
    "updated_at"           timestamp with time zone
);

-- ============================================================
-- Primary Key
-- DB-004: Every entity shall have exactly one Primary Key
-- DB-014: Primary Key is activity_id
-- ============================================================

ALTER TABLE ONLY "public"."activity"
    ADD CONSTRAINT "activity_pkey" PRIMARY KEY ("activity_id");

-- ============================================================
-- Unique Constraints
-- DB-014: activity_uid is unique and generated once
-- ============================================================

ALTER TABLE ONLY "public"."activity"
    ADD CONSTRAINT "activity_activity_uid_key" UNIQUE ("activity_uid");

-- ============================================================
-- Foreign Keys
-- DB-005: Every reference shall be validated
-- DB-014: Activity belongs to one Programme, Revision, and Task
-- ============================================================

-- activity.programme_id → programme.programme_id
ALTER TABLE ONLY "public"."activity"
    ADD CONSTRAINT "activity_programme_id_fkey"
    FOREIGN KEY ("programme_id")
    REFERENCES "public"."programme" ("programme_id");

-- activity.revision_id → programme_revision.revision_id
ALTER TABLE ONLY "public"."activity"
    ADD CONSTRAINT "activity_revision_id_fkey"
    FOREIGN KEY ("revision_id")
    REFERENCES "public"."programme_revision" ("revision_id");

-- activity.task_id → task.task_id
ALTER TABLE ONLY "public"."activity"
    ADD CONSTRAINT "activity_task_id_fkey"
    FOREIGN KEY ("task_id")
    REFERENCES "public"."task" ("task_id");

-- ============================================================
-- Indexes
-- DB-008: Improve query performance
-- DB-014: Required Indexes
-- ============================================================

-- activity: parent programme lookup
CREATE INDEX "idx_activity_programme_id"
    ON "public"."activity" USING btree ("programme_id");

-- activity: parent revision lookup
CREATE INDEX "idx_activity_revision_id"
    ON "public"."activity" USING btree ("revision_id");

-- activity: parent task lookup
CREATE INDEX "idx_activity_task_id"
    ON "public"."activity" USING btree ("task_id");

-- activity: composite index for programme, revision, and status operational filtering
CREATE INDEX "idx_activity_programme_id_revision_id_status"
    ON "public"."activity" USING btree ("programme_id", "revision_id", "status");

-- activity: composite index for AHI and subtask SearchPicker lookup
CREATE INDEX "idx_activity_ahi_subtask"
    ON "public"."activity" USING btree ("ahi", "subtask");

-- activity: operational date filter index
CREATE INDEX "idx_activity_activity_date"
    ON "public"."activity" USING btree ("activity_date");

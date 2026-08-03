-- ============================================================
-- Migration: Approval Engine
-- Sprint: DEV-008B
-- Date: 2026-08-03
-- Spec: DB-020 (approval)
-- Owner: Approval Engine (Zon Operasi)
--
-- Creates the approval table that forms the Approval Engine persistence model:
--   approval — operational review and approval workflow decisions (DB-020)
-- ============================================================

-- ============================================================
-- Enum: approval_status_type
-- Spec: DB-020
-- ============================================================

CREATE TYPE "public"."approval_status_type" AS ENUM (
    'Pending',
    'Approved',
    'Rejected',
    'Returned',
    'Cancelled'
);

-- ============================================================
-- Table: approval
-- Spec: DB-020
-- Owner: Approval Engine
-- Records review and approval decisions for operational records (AP-001, AP-002)
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."approval" (
    "approval_id"      uuid                         NOT NULL DEFAULT gen_random_uuid(),
    "programme_id"     uuid                         NOT NULL,
    "revision_id"      uuid                         NOT NULL,
    "activity_id"      uuid                         NOT NULL,
    "site_diary_id"    uuid,
    "progress_id"      uuid,
    "approval_level"   integer                      NOT NULL DEFAULT 1,
    "approval_status"  "public"."approval_status_type" NOT NULL DEFAULT 'Pending',
    "approval_date"    timestamp with time zone,
    "approval_comment" text,
    "approved_by"      uuid,
    "requested_by"     uuid                         NOT NULL,
    "requested_at"     timestamp with time zone     NOT NULL DEFAULT now(),
    "created_at"       timestamp with time zone     NOT NULL DEFAULT now(),
    "updated_at"       timestamp with time zone
);

-- ============================================================
-- Primary Key
-- DB-004: Every entity shall have exactly one Primary Key
-- DB-020: Primary Key is approval_id
-- ============================================================

ALTER TABLE ONLY "public"."approval"
    ADD CONSTRAINT "approval_pkey" PRIMARY KEY ("approval_id");

-- ============================================================
-- Foreign Keys
-- DB-005: Every reference shall be validated
-- DB-020: Approval belongs to Programme, Revision, Activity, Site Diary, Progress
-- ============================================================

-- approval.programme_id → programme.programme_id
ALTER TABLE ONLY "public"."approval"
    ADD CONSTRAINT "approval_programme_id_fkey"
    FOREIGN KEY ("programme_id")
    REFERENCES "public"."programme" ("programme_id");

-- approval.revision_id → programme_revision.revision_id
ALTER TABLE ONLY "public"."approval"
    ADD CONSTRAINT "approval_revision_id_fkey"
    FOREIGN KEY ("revision_id")
    REFERENCES "public"."programme_revision" ("revision_id");

-- approval.activity_id → activity.activity_id
ALTER TABLE ONLY "public"."approval"
    ADD CONSTRAINT "approval_activity_id_fkey"
    FOREIGN KEY ("activity_id")
    REFERENCES "public"."activity" ("activity_id");

-- approval.site_diary_id → site_diary.site_diary_id
ALTER TABLE ONLY "public"."approval"
    ADD CONSTRAINT "approval_site_diary_id_fkey"
    FOREIGN KEY ("site_diary_id")
    REFERENCES "public"."site_diary" ("site_diary_id");

-- approval.progress_id → progress.progress_id
ALTER TABLE ONLY "public"."approval"
    ADD CONSTRAINT "approval_progress_id_fkey"
    FOREIGN KEY ("progress_id")
    REFERENCES "public"."progress" ("progress_id");

-- ============================================================
-- Indexes
-- DB-008: Improve query performance
-- DB-020: Required Indexes
-- ============================================================

-- approval: parent programme lookup
CREATE INDEX "idx_approval_programme_id"
    ON "public"."approval" USING btree ("programme_id");

-- approval: parent revision lookup
CREATE INDEX "idx_approval_revision_id"
    ON "public"."approval" USING btree ("revision_id");

-- approval: parent activity lookup
CREATE INDEX "idx_approval_activity_id"
    ON "public"."approval" USING btree ("activity_id");

-- approval: parent site diary lookup
CREATE INDEX "idx_approval_site_diary_id"
    ON "public"."approval" USING btree ("site_diary_id");

-- approval: parent progress lookup
CREATE INDEX "idx_approval_progress_id"
    ON "public"."approval" USING btree ("progress_id");

-- approval: composite index for activity and status filtering
CREATE INDEX "idx_approval_activity_id_approval_status"
    ON "public"."approval" USING btree ("activity_id", "approval_status");

-- approval: composite index for site diary and status filtering
CREATE INDEX "idx_approval_site_diary_id_approval_status"
    ON "public"."approval" USING btree ("site_diary_id", "approval_status");

-- approval: approver filter index
CREATE INDEX "idx_approval_approved_by"
    ON "public"."approval" USING btree ("approved_by");

-- approval: request timestamp filter index
CREATE INDEX "idx_approval_requested_at"
    ON "public"."approval" USING btree ("requested_at");

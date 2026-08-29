-- ============================================================
-- Migration: MSP Engine (Task Schema)
-- Sprint: DEV-002A
-- Date: 2026-08-02
-- Spec: DB-013 (task)
-- Owner: Planning Engine / MSP Engine (Zon Penjadualan)
--
-- Creates the task table that forms the MSP Engine persistence model:
--   task — imported planning activities from Microsoft Project (DB-013)
-- ============================================================

-- ============================================================
-- Table: task
-- Spec: DB-013
-- Owner: Planning Engine / MSP Engine
-- Defines the official planning structure for a Programme Revision (ADR-006)
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."task" (
    "task_id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
    "programme_id"          uuid                     NOT NULL,
    "revision_id"           uuid                     NOT NULL,
    "task_uid"              integer                  NOT NULL,
    "task_guid"             uuid,
    "wbs"                   character varying(100),
    "task_name"              text                     NOT NULL,
    "parent_task_uid"       integer,
    "outline_level"         integer,
    "display_order"         integer,
    "planned_start"         date,
    "planned_finish"        date,
    "planned_duration_days" numeric,
    "is_milestone"          boolean                  DEFAULT false,
    "is_critical"           boolean                  DEFAULT false,
    "is_summary"            boolean                  DEFAULT false,
    "constraint_type"       character varying,
    "constraint_date"       date,
    "created_at"            timestamp with time zone NOT NULL DEFAULT now(),
    "created_by"            uuid                     NOT NULL
);

-- ============================================================
-- Primary Key
-- DB-004: Every entity shall have exactly one Primary Key
-- DB-013: Primary Key is task_id
-- ============================================================

ALTER TABLE ONLY "public"."task"
    ADD CONSTRAINT "task_pkey" PRIMARY KEY ("task_id");

-- ============================================================
-- Unique Constraints
-- DB-013: Task UID is unique within a Programme Revision (revision_id, task_uid)
-- ============================================================

ALTER TABLE ONLY "public"."task"
    ADD CONSTRAINT "task_revision_id_task_uid_key"
    UNIQUE ("revision_id", "task_uid");

-- ============================================================
-- Foreign Keys
-- DB-005: Every reference shall be validated
-- DB-013: Task belongs to one Programme and one Programme Revision
-- ============================================================

-- task.programme_id → programme.programme_id
ALTER TABLE ONLY "public"."task"
    ADD CONSTRAINT "task_programme_id_fkey"
    FOREIGN KEY ("programme_id")
    REFERENCES "public"."programme" ("programme_id");

-- task.revision_id → programme_revision.revision_id
ALTER TABLE ONLY "public"."task"
    ADD CONSTRAINT "task_revision_id_fkey"
    FOREIGN KEY ("revision_id")
    REFERENCES "public"."programme_revision" ("revision_id");

-- ============================================================
-- Indexes
-- DB-008: Improve query performance
-- DB-013: Required Indexes
-- ============================================================

-- task: parent programme lookup
CREATE INDEX "idx_task_programme_id"
    ON "public"."task" USING btree ("programme_id");

-- task: parent revision lookup
CREATE INDEX "idx_task_revision_id"
    ON "public"."task" USING btree ("revision_id");

-- task: composite index for revision and UID queries (covers unique constraint)
CREATE INDEX "idx_task_revision_id_task_uid"
    ON "public"."task" USING btree ("revision_id", "task_uid");

-- task: WBS hierarchy search index
CREATE INDEX "idx_task_wbs"
    ON "public"."task" USING btree ("wbs");

-- task: planned start date filter index
CREATE INDEX "idx_task_planned_start"
    ON "public"."task" USING btree ("planned_start");

-- task: planned finish date filter index
CREATE INDEX "idx_task_planned_finish"
    ON "public"."task" USING btree ("planned_finish");

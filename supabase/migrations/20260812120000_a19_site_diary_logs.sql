-- ============================================================
-- Migration: A19 Phase 1.5 - Canonical site_diary_logs
-- Date: 2026-08-12
-- Purpose: Recreate canonical site_diary_logs for Activity Engine after DB-001 renamed legacy table.
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."site_diary_logs" (
    "log_id"        uuid                     NOT NULL DEFAULT gen_random_uuid(),
    "activity_id"   uuid                     NOT NULL,
    "event_type"    character varying(50)    NOT NULL,
    "snapshot_data" jsonb                    NOT NULL,
    "logged_by"     uuid                     NOT NULL,
    "logged_at"     timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "site_diary_logs_pkey" PRIMARY KEY ("log_id"),
    CONSTRAINT "site_diary_logs_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activity" ("activity_id") ON DELETE CASCADE
);

CREATE INDEX "idx_site_diary_logs_activity_id" ON "public"."site_diary_logs" USING btree ("activity_id");
CREATE INDEX "idx_site_diary_logs_logged_at" ON "public"."site_diary_logs" USING btree ("logged_at");

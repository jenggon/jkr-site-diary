-- ============================================================
-- Migration: A19 Phase 1.5 Round 2 - Canonical activity_logs
-- Date: 2026-08-12
-- Purpose: Migrate the mistakenly named site_diary_logs to the canonical activity_logs table for Activity Engine.
-- ============================================================

-- Rename the table
ALTER TABLE IF EXISTS "public"."site_diary_logs" RENAME TO "activity_logs";

-- Rename indexes
ALTER INDEX IF EXISTS "idx_site_diary_logs_activity_id" RENAME TO "idx_activity_logs_activity_id";
ALTER INDEX IF EXISTS "idx_site_diary_logs_logged_at" RENAME TO "idx_activity_logs_logged_at";

-- Rename primary key constraint
ALTER TABLE "public"."activity_logs" RENAME CONSTRAINT "site_diary_logs_pkey" TO "activity_logs_pkey";

-- Rename foreign key constraint
ALTER TABLE "public"."activity_logs" RENAME CONSTRAINT "site_diary_logs_activity_id_fkey" TO "activity_logs_activity_id_fkey";

-- Enforce Immutability (RLS)
-- We must ensure ordinary users cannot UPDATE or DELETE historical logs.
ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;

-- Allow INSERT for authenticated users
CREATE POLICY "Enable insert for authenticated users only" ON "public"."activity_logs"
FOR INSERT TO authenticated WITH CHECK (true);

-- Allow SELECT for authenticated users
CREATE POLICY "Enable read access for all users" ON "public"."activity_logs"
FOR SELECT TO authenticated USING (true);

-- Explicitly DO NOT create policies for UPDATE or DELETE, which means they are denied by default under RLS.

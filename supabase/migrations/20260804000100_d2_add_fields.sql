-- ============================================================
-- Migration: D2 Remediation Add Fields
-- Date: 2026-08-04
-- Specs: DB-013 (task), DB-012 (programme_revision)
-- Owner: Architecture / D2 Remediation
-- ============================================================

ALTER TABLE ONLY "public"."programme_revision"
    ADD COLUMN IF NOT EXISTS "msp_file_hash" character varying(64);

ALTER TABLE ONLY "public"."task"
    ADD COLUMN IF NOT EXISTS "outline_number" character varying(100);

ALTER TABLE ONLY "public"."task"
    ADD COLUMN IF NOT EXISTS "trade_code" character varying(50);

ALTER TABLE ONLY "public"."task"
    ADD COLUMN IF NOT EXISTS "trade_name" character varying(150);

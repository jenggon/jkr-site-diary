-- ============================================================
-- Migration: S2 Programme Revision Lifecycle Enum Expansion
-- Date: 2026-08-09
-- Spec: DB-012 (programme_revision)
-- Owner: Programme Engine / S2 Revision Lifecycle
--
-- Extends the programme_lifecycle_status ENUM to support:
--   - UnderReview (revision under formal review process)
--   - Superseded  (previous approved revision superseded by a new approved revision)
--
-- Preserves existing ENUM values ('Draft', 'Approved', 'Archived') without destructive recreation.
-- ============================================================

ALTER TYPE "public"."programme_lifecycle_status" ADD VALUE IF NOT EXISTS 'UnderReview';
ALTER TYPE "public"."programme_lifecycle_status" ADD VALUE IF NOT EXISTS 'Superseded';

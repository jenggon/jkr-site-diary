-- Migration: 20260829230000_f3_b03_read_isolation_grant_closure.sql
-- Description: F3-B03 Database Read Isolation & Grant Closure
-- Authority: F3 Security Architecture / Database Read-Trust-Boundary Remediation
--
-- Target Tables:
--   1. public.audit        (RLS enabled, SELECT granted to authenticated, scoped via private.is_programme_member)
--   2. public.approval     (RLS enabled, direct SELECT denied, capability RPC read boundary preserved)
--   3. public.progress     (RLS enabled, direct SELECT denied / fail-closed, mutation RPCs preserved)
--   4. public.vo_item      (RLS enabled, SELECT granted to authenticated, scoped via private.is_programme_member)
--   5. public.workforce    (RLS preserved, legacy USING(true) dropped, scoped via private.is_programme_member)
--   6. public.activity_logs (RLS preserved, legacy USING(true) dropped, parent-derived via activity -> programme)
--   7. public.site_diary_logs (RLS preserved, legacy USING(true) dropped, parent-derived via site_diary -> programme)

-- ============================================================
-- 1. Enable Row Level Security (non-FORCE) on All Target Tables
-- ============================================================

ALTER TABLE "public"."audit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."approval" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."progress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."vo_item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."workforce" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."site_diary_logs" ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Drop Obsolete / Overly Permissive Legacy Policies
-- ============================================================

DROP POLICY IF EXISTS "a27_authenticated_workforce_read" ON "public"."workforce";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."activity_logs";
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."activity_logs";
DROP POLICY IF EXISTS "authenticated_read_site_diary_history" ON "public"."site_diary_logs";

-- ============================================================
-- 3. Explicit Table Grants & Privilege Normalization
-- ============================================================

-- Revoke all direct privileges on all seven targets from PUBLIC, anon, authenticated
REVOKE ALL ON TABLE "public"."audit" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE "public"."approval" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE "public"."progress" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE "public"."vo_item" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE "public"."workforce" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE "public"."activity_logs" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE "public"."site_diary_logs" FROM PUBLIC, anon, authenticated;

-- Grant authenticated SELECT-only on sanctioned readable surfaces
GRANT SELECT ON TABLE "public"."audit" TO authenticated;
GRANT SELECT ON TABLE "public"."vo_item" TO authenticated;
GRANT SELECT ON TABLE "public"."workforce" TO authenticated;
GRANT SELECT ON TABLE "public"."activity_logs" TO authenticated;
GRANT SELECT ON TABLE "public"."site_diary_logs" TO authenticated;

-- Explicitly NO direct SELECT granted on public.approval or public.progress.
-- Direct PostgREST / table reads on approval and progress remain denied / fail-closed.

-- ============================================================
-- 4. Create Canonical Programme-Scoped Read Policies
-- ============================================================

-- Target 1: public.audit (Direct Programme Ownership)
CREATE POLICY "f3_b03_audit_select"
ON "public"."audit"
FOR SELECT
TO authenticated
USING (
    "private"."is_programme_member"("programme_id")
);

-- Target 4: public.vo_item (Direct Programme Ownership)
CREATE POLICY "f3_b03_vo_item_select"
ON "public"."vo_item"
FOR SELECT
TO authenticated
USING (
    "private"."is_programme_member"("programme_id")
);

-- Target 5: public.workforce (Direct Programme Ownership)
CREATE POLICY "f3_b03_workforce_select"
ON "public"."workforce"
FOR SELECT
TO authenticated
USING (
    "private"."is_programme_member"("programme_id")
);

-- Target 6: public.activity_logs (Parent-Derived: Activity -> Programme)
CREATE POLICY "f3_b03_activity_logs_select"
ON "public"."activity_logs"
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM "public"."activity" AS a
        WHERE a."activity_id" = "activity_logs"."activity_id"
          AND "private"."is_programme_member"(a."programme_id")
    )
);

-- Target 7: public.site_diary_logs (Parent-Derived: Site Diary -> Programme)
CREATE POLICY "f3_b03_site_diary_logs_select"
ON "public"."site_diary_logs"
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM "public"."site_diary" AS sd
        WHERE sd."site_diary_id" = "site_diary_logs"."site_diary_id"
          AND "private"."is_programme_member"(sd."programme_id")
    )
);

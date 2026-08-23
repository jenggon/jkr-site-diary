-- F2.7-C07-R1 — Dependent Programme-Context Read Authority
--
-- These four dependent tables expose authenticated, Programme-scoped reads.
-- The existing C04 membership helper remains the sole authority predicate.

ALTER TABLE "public"."programme_revision" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."programme_revision" FROM anon, authenticated;
GRANT SELECT ON TABLE "public"."programme_revision" TO authenticated;

CREATE POLICY "c07_programme_member_select_programme_revision"
ON "public"."programme_revision"
FOR SELECT
TO authenticated
USING (
    "private"."is_programme_member"("programme_id")
);

ALTER TABLE "public"."task" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."task" FROM anon, authenticated;
GRANT SELECT ON TABLE "public"."task" TO authenticated;

CREATE POLICY "c07_programme_member_select_task"
ON "public"."task"
FOR SELECT
TO authenticated
USING (
    "private"."is_programme_member"("programme_id")
);

ALTER TABLE "public"."activity" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."activity" FROM anon, authenticated;
GRANT SELECT ON TABLE "public"."activity" TO authenticated;

CREATE POLICY "c07_programme_member_select_activity"
ON "public"."activity"
FOR SELECT
TO authenticated
USING (
    "private"."is_programme_member"("programme_id")
);

ALTER TABLE "public"."site_diary" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."site_diary" FROM anon, authenticated;
GRANT SELECT ON TABLE "public"."site_diary" TO authenticated;

CREATE POLICY "c07_programme_member_select_site_diary"
ON "public"."site_diary"
FOR SELECT
TO authenticated
USING (
    "private"."is_programme_member"("programme_id")
);

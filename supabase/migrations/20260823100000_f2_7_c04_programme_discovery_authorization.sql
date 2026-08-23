-- F2.7-C04-R1 — Programme Discovery Authorization Remediation
--
-- Programme discovery is authorized at the database boundary. The caller is
-- the authenticated JWT subject; sealed programme_membership rows remain
-- inaccessible to browser and application clients.

CREATE OR REPLACE FUNCTION "private"."is_programme_member"(
    p_programme_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT "auth"."uid"() IS NOT NULL
       AND EXISTS (
            SELECT 1
              FROM "public"."programme_membership" AS pm
             WHERE pm."programme_id" = p_programme_id
               AND pm."user_id" = "auth"."uid"()
               AND pm."is_active" = true
       );
$$;

REVOKE ALL ON FUNCTION "private"."is_programme_member"(uuid)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "private"."is_programme_member"(uuid)
    TO authenticated;

ALTER TABLE "public"."programme" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."programme" FROM anon, authenticated;
GRANT SELECT ON TABLE "public"."programme" TO authenticated;

CREATE POLICY "c04_active_programme_membership_select"
ON "public"."programme"
FOR SELECT
TO authenticated
USING (
    "private"."is_programme_member"("programme_id")
);

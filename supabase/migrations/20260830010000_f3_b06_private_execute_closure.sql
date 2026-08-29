-- F3-B06-CORR-001 — Private SECURITY DEFINER EXECUTE closure
-- Severity: MEDIUM (defense in depth / exact privilege contract)
--
-- Fresh-schema catalog proof found historical helpers that retained default
-- function EXECUTE grants. Direct client invocation was already blocked by the
-- lack of USAGE on schema private, but the final F3 contract requires private
-- authority helpers, internal delegates, and trigger functions to have no
-- PUBLIC, anon, or authenticated EXECUTE grant of their own.
--
-- private.is_programme_member(uuid) is intentionally excluded: authenticated
-- EXECUTE is required for the locked B03 RLS policy expressions, while direct
-- client invocation remains blocked by the private schema USAGE posture.

REVOKE ALL ON FUNCTION "private"."assert_capability"(
  uuid, uuid, character varying
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION "private"."a27_create_approval_atomic"(
  jsonb, uuid, uuid, uuid, timestamptz
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION "private"."f24_assert_site_diary_unsealed"(
  uuid
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION "private"."get_site_diary_approval_queue"(
  uuid, uuid
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION "private"."trg_bootstrap_programme_creator"()
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION "private"."trg_check_programme_membership_role_scope"()
FROM PUBLIC, anon, authenticated;

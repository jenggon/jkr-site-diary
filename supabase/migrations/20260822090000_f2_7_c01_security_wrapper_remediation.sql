-- Migration: F2.7-C01 Public Security Wrapper Remediation
--
-- Root cause: The three public read wrappers were created as SECURITY INVOKER.
-- When the authenticated role calls them, PostgreSQL checks whether authenticated
-- has USAGE ON SCHEMA private before resolving private.get_*() references.
-- That privilege was deliberately revoked in a27_atomic_security_hardening.sql.
-- The result is a spurious "permission denied for schema private" infrastructure
-- error instead of the expected domain capability denial.
--
-- Fix: Replace SECURITY INVOKER with SECURITY DEFINER on the three public
-- wrappers only. Actor identity is derived from auth.uid() inside the definer
-- boundary — identical to the working a27_update_approval_atomic pattern.
--
-- This is a FORWARD CORRECTION only.
-- Historical migrations are NOT modified.
-- No USAGE ON SCHEMA private is granted to authenticated.
-- No direct private function access is granted to authenticated.
-- Existing private delegate logic is unchanged.
-- Public function signatures and return types are preserved exactly.

-- ============================================================
-- 0. private.get_site_diary_approval_queue return-type closure
-- ============================================================
-- The canonical delegate declares activity_name as character varying while
-- activity.subtask_display_name is text. Preserve the declared contract with
-- the narrow explicit cast; all authority and queue semantics remain unchanged.

CREATE OR REPLACE FUNCTION "private"."get_site_diary_approval_queue"(
    p_actor_id uuid,
    p_programme_id uuid
)
RETURNS TABLE (
    approval_id uuid,
    site_diary_id uuid,
    programme_id uuid,
    revision_id uuid,
    activity_id uuid,
    approval_status "public"."approval_status_type",
    approval_level integer,
    requested_at timestamptz,
    requested_by uuid,
    requester_name character varying,
    activity_name character varying,
    activity_date date,
    approval_date timestamptz,
    approved_by uuid,
    approver_name character varying
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    PERFORM "private"."a27_assert_actor"(p_actor_id);

    PERFORM "private"."assert_capability"(
        p_actor_id, p_programme_id, 'SITE_DIARY_APPROVAL_QUEUE_VIEW'
    );

    RETURN QUERY
    SELECT
        a.approval_id,
        a.site_diary_id,
        a.programme_id,
        a.revision_id,
        a.activity_id,
        a.approval_status,
        a.approval_level,
        a.requested_at,
        a.requested_by,
        up_req.full_name AS requester_name,
        act.subtask_display_name::character varying AS activity_name,
        sd.activity_date,
        a.approval_date,
        a.approved_by,
        up_app.full_name AS approver_name
    FROM "public"."approval" a
    JOIN "public"."site_diary" sd ON a.site_diary_id = sd.site_diary_id
    JOIN "public"."activity" act ON a.activity_id = act.activity_id
    LEFT JOIN "public"."user_profile" up_req ON a.requested_by = up_req.user_id
    LEFT JOIN "public"."user_profile" up_app ON a.approved_by = up_app.user_id
    WHERE a.programme_id = p_programme_id
      AND a.site_diary_id IS NOT NULL
    ORDER BY a.requested_at DESC;
END;
$$;

-- ============================================================
-- 1. f24_get_site_diary_approval_queue
-- ============================================================
-- Original: LANGUAGE sql SECURITY INVOKER
-- Corrected: LANGUAGE sql SECURITY DEFINER
-- Actor: auth.uid() derived inside definer boundary
-- Private delegate: private.get_site_diary_approval_queue(uuid, uuid)
-- Privilege guards: assert_capability(SITE_DIARY_APPROVAL_QUEUE_VIEW) in private

CREATE OR REPLACE FUNCTION "public"."f24_get_site_diary_approval_queue"(
    p_programme_id uuid
)
RETURNS TABLE (
    approval_id uuid,
    site_diary_id uuid,
    programme_id uuid,
    revision_id uuid,
    activity_id uuid,
    approval_status "public"."approval_status_type",
    approval_level integer,
    requested_at timestamptz,
    requested_by uuid,
    requester_name character varying,
    activity_name character varying,
    activity_date date,
    approval_date timestamptz,
    approved_by uuid,
    approver_name character varying
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT * FROM "private"."get_site_diary_approval_queue"(
        "auth"."uid"(), p_programme_id
    );
$$;

REVOKE ALL ON FUNCTION "public"."f24_get_site_diary_approval_queue"(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."f24_get_site_diary_approval_queue"(uuid) TO authenticated;

-- ============================================================
-- 2. f24_get_site_diary_approval_review
-- ============================================================
-- Original: LANGUAGE sql SECURITY INVOKER
-- Corrected: LANGUAGE sql SECURITY DEFINER
-- Actor: auth.uid() derived inside definer boundary
-- Private delegate: private.get_site_diary_approval_review(uuid, uuid)
-- Privilege guards: assert_capability(SITE_DIARY_APPROVAL_QUEUE_VIEW)
--   against programme derived from the approval row itself (no client-supplied programme)

CREATE OR REPLACE FUNCTION "public"."f24_get_site_diary_approval_review"(
    p_approval_id uuid
)
RETURNS TABLE (
    approval_id uuid,
    programme_id uuid,
    revision_id uuid,
    activity_id uuid,
    site_diary_id uuid,
    progress_id uuid,
    approval_level integer,
    approval_status "public"."approval_status_type",
    approval_date timestamptz,
    approval_comment text,
    approved_by uuid,
    requested_by uuid,
    requested_at timestamptz,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT *
      FROM "private"."get_site_diary_approval_review"(
          "auth"."uid"(),
          p_approval_id
      );
$$;

REVOKE ALL ON FUNCTION "public"."f24_get_site_diary_approval_review"(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."f24_get_site_diary_approval_review"(uuid) TO authenticated;

-- ============================================================
-- 3. f25_get_site_diary_print_read
-- ============================================================
-- Original: LANGUAGE sql SECURITY INVOKER
-- Corrected: LANGUAGE sql SECURITY DEFINER
-- Actor: auth.uid() derived inside definer boundary
-- Private delegate: private.get_site_diary_print_read(uuid, uuid)
-- Privilege guards: assert_capability(SITE_DIARY_PRINT_READ)
--   against programme derived canonically from the site_diary row

CREATE OR REPLACE FUNCTION "public"."f25_get_site_diary_print_read"(
    p_site_diary_id uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT "private"."get_site_diary_print_read"(
        "auth"."uid"(), p_site_diary_id
    );
$$;

REVOKE ALL ON FUNCTION "public"."f25_get_site_diary_print_read"(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."f25_get_site_diary_print_read"(uuid) TO authenticated;

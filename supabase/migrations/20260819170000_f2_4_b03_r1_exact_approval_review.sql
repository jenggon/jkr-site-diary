-- F2.4-B03-R1: exact, capability-gated Site Diary approval review read.

CREATE OR REPLACE FUNCTION "private"."get_site_diary_approval_review"(
    p_actor_id uuid,
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_approval "public"."approval"%ROWTYPE;
BEGIN
    PERFORM "private"."a27_assert_actor"(p_actor_id);

    SELECT a.*
      INTO v_approval
      FROM "public"."approval" AS a
     WHERE a.approval_id = p_approval_id;

    IF NOT FOUND OR v_approval.site_diary_id IS NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = 'PT404',
            MESSAGE = 'F24_SITE_DIARY_APPROVAL_REVIEW_NOT_FOUND';
    END IF;

    PERFORM "private"."assert_capability"(
        p_actor_id,
        v_approval.programme_id,
        'SITE_DIARY_APPROVAL_QUEUE_VIEW'
    );

    RETURN QUERY
    SELECT
        v_approval.approval_id,
        v_approval.programme_id,
        v_approval.revision_id,
        v_approval.activity_id,
        v_approval.site_diary_id,
        v_approval.progress_id,
        v_approval.approval_level,
        v_approval.approval_status,
        v_approval.approval_date,
        v_approval.approval_comment,
        v_approval.approved_by,
        v_approval.requested_by,
        v_approval.requested_at,
        v_approval.created_at,
        v_approval.updated_at;
END;
$$;

REVOKE ALL ON FUNCTION "private"."get_site_diary_approval_review"(uuid, uuid)
FROM PUBLIC, anon, authenticated;

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
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT *
      FROM "private"."get_site_diary_approval_review"(
          (SELECT "auth"."uid"()),
          p_approval_id
      );
$$;

REVOKE ALL ON FUNCTION "public"."f24_get_site_diary_approval_review"(uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."f24_get_site_diary_approval_review"(uuid)
TO authenticated;

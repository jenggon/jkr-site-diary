-- Migration: F2.4-B03 Approval Queue Authority

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
        act.subtask_display_name AS activity_name,
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
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT * FROM "private"."get_site_diary_approval_queue"(
        (SELECT auth.uid()), p_programme_id
    );
$$;

REVOKE ALL ON FUNCTION "public"."f24_get_site_diary_approval_queue"(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."f24_get_site_diary_approval_queue"(uuid) TO authenticated;

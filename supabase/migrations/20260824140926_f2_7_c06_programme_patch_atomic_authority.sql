-- Migration: 20260824140926_f2_7_c06_programme_patch_atomic_authority.sql
-- F2.7-C06 — Programme PATCH Atomic Authority

CREATE OR REPLACE FUNCTION "private"."c06_update_programme_core"(
    p_programme_id uuid,
    p_payload jsonb,
    p_actor_id uuid,
    p_audit_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_programme "public"."programme";
    v_old_programme "public"."programme";
BEGIN
    PERFORM "private"."a27_assert_actor"(p_actor_id);

    IF NOT "private"."is_programme_member"(p_programme_id) THEN
        RAISE EXCEPTION 'C06_PROGRAMME_UPDATE_UNAUTHORIZED' USING ERRCODE = 'PT403';
    END IF;

    SELECT * INTO v_old_programme
      FROM "public"."programme"
     WHERE programme_id = p_programme_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'C06_PROGRAMME_NOT_FOUND' USING ERRCODE = 'PT404';
    END IF;

    IF v_old_programme.status = 'Archived' THEN
        RAISE EXCEPTION 'C06_PROGRAMME_ARCHIVED' USING ERRCODE = 'PT409';
    END IF;

    IF v_old_programme.is_locked = true THEN
        RAISE EXCEPTION 'C06_PROGRAMME_LOCKED' USING ERRCODE = 'PT409';
    END IF;

    UPDATE "public"."programme"
       SET programme_name = coalesce(nullif(p_payload->>'programme_name', ''), programme_name),
           employer_name = CASE WHEN p_payload ? 'employer_name' THEN p_payload->>'employer_name' ELSE employer_name END,
           contractor_name = CASE WHEN p_payload ? 'contractor_name' THEN p_payload->>'contractor_name' ELSE contractor_name END,
           supervising_officer = CASE WHEN p_payload ? 'supervising_officer' THEN p_payload->>'supervising_officer' ELSE supervising_officer END,
           contract_start_date = CASE WHEN p_payload ? 'contract_start_date' THEN nullif(p_payload->>'contract_start_date','')::date ELSE contract_start_date END,
           contract_completion_date = CASE WHEN p_payload ? 'contract_completion_date' THEN nullif(p_payload->>'contract_completion_date','')::date ELSE contract_completion_date END,
           defect_liability_end = CASE WHEN p_payload ? 'defect_liability_end' THEN nullif(p_payload->>'defect_liability_end','')::date ELSE defect_liability_end END,
           updated_at = now(),
           updated_by = p_actor_id
     WHERE programme_id = p_programme_id
 RETURNING * INTO v_programme;

    PERFORM "private"."a27_write_audit"(
        p_audit_id,
        p_programme_id,
        v_programme.current_revision_id,
        'PROGRAMME',
        p_programme_id,
        'Update',
        p_actor_id,
        jsonb_build_object('old', to_jsonb(v_old_programme)),
        to_jsonb(v_programme)
    );

    RETURN to_jsonb(v_programme);
END;
$$;

REVOKE ALL ON FUNCTION "private"."c06_update_programme_core"(uuid, jsonb, uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION "public"."c06_update_programme_atomic"(
    p_programme_id uuid,
    p_payload jsonb,
    p_actor_id uuid,
    p_audit_id uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT "private"."c06_update_programme_core"($1, $2, $3, $4)
$$;

REVOKE ALL ON FUNCTION "public"."c06_update_programme_atomic"(uuid, jsonb, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."c06_update_programme_atomic"(uuid, jsonb, uuid, uuid) TO authenticated;

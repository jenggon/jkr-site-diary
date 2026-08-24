-- Migration: 20260824143901_f2_7_c06_programme_update_capability_and_fixes.sql

-- 1. Add PROGRAMME_UPDATE permission and map to PROJECT_MANAGER
INSERT INTO "public"."permission" (permission_id, permission_code, module) VALUES
    (gen_random_uuid(), 'PROGRAMME_UPDATE', 'PROGRAMME')
ON CONFLICT (permission_code) DO NOTHING;

DO $$
DECLARE
    v_pm uuid := (SELECT role_id FROM "public"."role" WHERE role_code = 'PROJECT_MANAGER');
    v_update uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'PROGRAMME_UPDATE');
BEGIN
    INSERT INTO "public"."role_permission" (role_id, permission_id)
    VALUES (v_pm, v_update)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
END;
$$;

-- 2. Update private.c06_update_programme_core to use assert_capability and enforce date invariants
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
    v_eff_start date;
    v_eff_comp date;
    v_eff_dle date;
BEGIN
    PERFORM "private"."a27_assert_actor"(p_actor_id);

    PERFORM "private"."assert_capability"(p_actor_id, p_programme_id, 'PROGRAMME_UPDATE');

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

    BEGIN
        v_eff_start := CASE WHEN p_payload ? 'contract_start_date' THEN nullif(p_payload->>'contract_start_date','')::date ELSE v_old_programme.contract_start_date END;
        v_eff_comp := CASE WHEN p_payload ? 'contract_completion_date' THEN nullif(p_payload->>'contract_completion_date','')::date ELSE v_old_programme.contract_completion_date END;
        v_eff_dle := CASE WHEN p_payload ? 'defect_liability_end' THEN nullif(p_payload->>'defect_liability_end','')::date ELSE v_old_programme.defect_liability_end END;
    EXCEPTION WHEN others THEN
        RAISE EXCEPTION 'C06_MALFORMED_DATE' USING ERRCODE = 'PT400';
    END;

    IF v_eff_start IS NOT NULL AND v_eff_comp IS NOT NULL THEN
        IF v_eff_comp < v_eff_start THEN
            RAISE EXCEPTION 'C06_COMPLETION_BEFORE_START' USING ERRCODE = 'PT400';
        END IF;
    END IF;

    IF v_eff_comp IS NOT NULL AND v_eff_dle IS NOT NULL THEN
        IF v_eff_dle < v_eff_comp THEN
            RAISE EXCEPTION 'C06_DEFECT_END_BEFORE_COMPLETION' USING ERRCODE = 'PT400';
        END IF;
    END IF;

    UPDATE "public"."programme"
       SET programme_name = coalesce(nullif(p_payload->>'programme_name', ''), programme_name),
           employer_name = CASE WHEN p_payload ? 'employer_name' THEN p_payload->>'employer_name' ELSE employer_name END,
           contractor_name = CASE WHEN p_payload ? 'contractor_name' THEN p_payload->>'contractor_name' ELSE contractor_name END,
           supervising_officer = CASE WHEN p_payload ? 'supervising_officer' THEN p_payload->>'supervising_officer' ELSE supervising_officer END,
           contract_start_date = v_eff_start,
           contract_completion_date = v_eff_comp,
           defect_liability_end = v_eff_dle,
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

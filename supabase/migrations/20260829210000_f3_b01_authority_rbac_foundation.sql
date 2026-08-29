-- Migration: 20260829210000_f3_b01_authority_rbac_foundation.sql
-- Description: F3-B01 Authority Foundation & RBAC Closure

-- ============================================================
-- 1. User Profile Global Role Schema Extension & Scope Trigger
-- ============================================================

ALTER TABLE "public"."user_profile"
ADD COLUMN IF NOT EXISTS "global_role_id" uuid REFERENCES "public"."role"("role_id") ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION "private"."trg_check_user_profile_global_role_scope"()
RETURNS trigger AS $$
DECLARE
    v_scope varchar(50);
BEGIN
    IF NEW.global_role_id IS NOT NULL THEN
        SELECT scope INTO v_scope FROM "public"."role" WHERE role_id = NEW.global_role_id;
        IF v_scope IS NULL OR v_scope <> 'Global' THEN
            RAISE EXCEPTION 'Cannot assign a Programme role as a global_role_id.' USING ERRCODE = 'PT400';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS "trg_check_user_profile_global_role_scope" ON "public"."user_profile";
CREATE TRIGGER "trg_check_user_profile_global_role_scope"
BEFORE INSERT OR UPDATE ON "public"."user_profile"
FOR EACH ROW EXECUTE FUNCTION "private"."trg_check_user_profile_global_role_scope"();

-- ============================================================
-- 2. Seed Missing Canonical Programme Roles
-- ============================================================

INSERT INTO "public"."role" (role_id, role_code, role_name, scope) VALUES
(gen_random_uuid(), 'PLANNER', 'Planner', 'Programme'),
(gen_random_uuid(), 'SUPERINTENDING_OFFICER', 'Superintending Officer', 'Programme'),
(gen_random_uuid(), 'SITE_ENGINEER', 'Site Engineer', 'Programme'),
(gen_random_uuid(), 'ASSISTANT_ENGINEER', 'Assistant Engineer', 'Programme')
ON CONFLICT (role_code) DO NOTHING;

-- ============================================================
-- 3. Seed Canonical Permission Catalogue (New F3 Permissions)
-- ============================================================

INSERT INTO "public"."permission" (permission_id, permission_code, module) VALUES
(gen_random_uuid(), 'PROGRAMME_CREATE', 'Programme'),
(gen_random_uuid(), 'PROGRAMME_ARCHIVE', 'Programme'),
(gen_random_uuid(), 'REVISION_IMPORT', 'Revision'),
(gen_random_uuid(), 'REVISION_APPROVE', 'Revision'),
(gen_random_uuid(), 'TASK_UPDATE', 'Task'),
(gen_random_uuid(), 'ACTIVITY_CREATE', 'Activity'),
(gen_random_uuid(), 'ACTIVITY_UPDATE', 'Activity'),
(gen_random_uuid(), 'ACTIVITY_EXECUTE', 'Activity'),
(gen_random_uuid(), 'SITE_DIARY_CREATE', 'SiteDiary'),
(gen_random_uuid(), 'SITE_DIARY_UPDATE', 'SiteDiary'),
(gen_random_uuid(), 'WORKFORCE_MANAGE', 'Workforce'),
(gen_random_uuid(), 'PROGRESS_EDIT', 'Progress'),
(gen_random_uuid(), 'PROGRESS_VERIFY', 'Progress'),
(gen_random_uuid(), 'PROGRESS_APPROVE', 'Progress'),
(gen_random_uuid(), 'TRADE_LIBRARY_MANAGE', 'TradeLibrary'),
(gen_random_uuid(), 'VO_ITEM_CREATE', 'VO')
ON CONFLICT (permission_code) DO NOTHING;

-- ============================================================
-- 4. Seed Role-Permission Mappings
-- ============================================================

DO $$
DECLARE
    -- Global Roles
    v_sys_admin uuid := (SELECT role_id FROM "public"."role" WHERE role_code = 'SYSTEM_ADMIN');
    v_hq_admin  uuid := (SELECT role_id FROM "public"."role" WHERE role_code = 'HQ_ADMIN');

    -- Programme Roles
    v_planner uuid := (SELECT role_id FROM "public"."role" WHERE role_code = 'PLANNER');
    v_so      uuid := (SELECT role_id FROM "public"."role" WHERE role_code = 'SUPERINTENDING_OFFICER');
    v_re      uuid := (SELECT role_id FROM "public"."role" WHERE role_code = 'RESIDENT_ENGINEER');
    v_ae      uuid := (SELECT role_id FROM "public"."role" WHERE role_code = 'ASSISTANT_ENGINEER');
    v_se      uuid := (SELECT role_id FROM "public"."role" WHERE role_code = 'SITE_ENGINEER');
    v_ss      uuid := (SELECT role_id FROM "public"."role" WHERE role_code = 'SITE_SUPERVISOR');

    -- Existing Permissions
    v_perm_prog_mem_manage uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'PROGRAMME_MEMBERSHIP_MANAGE');
    v_perm_prog_update     uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'PROGRAMME_UPDATE');
    v_perm_sd_app_req      uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'SITE_DIARY_APPROVAL_REQUEST');
    v_perm_sd_app_rev      uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'SITE_DIARY_APPROVAL_REVIEW');
    v_perm_sd_app_app      uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'SITE_DIARY_APPROVAL_APPROVE');
    v_perm_sd_app_ret      uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'SITE_DIARY_APPROVAL_RETURN');
    v_perm_sd_app_rej      uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'SITE_DIARY_APPROVAL_REJECT');
    v_perm_sd_app_can      uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'SITE_DIARY_APPROVAL_CANCEL');
    v_perm_sd_app_queue    uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'SITE_DIARY_APPROVAL_QUEUE_VIEW');
    v_perm_sd_print        uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'SITE_DIARY_PRINT_READ');

    -- New F3 Permissions
    v_perm_prog_create   uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'PROGRAMME_CREATE');
    v_perm_prog_archive  uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'PROGRAMME_ARCHIVE');
    v_perm_rev_import    uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'REVISION_IMPORT');
    v_perm_rev_approve   uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'REVISION_APPROVE');
    v_perm_task_update   uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'TASK_UPDATE');
    v_perm_act_create    uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'ACTIVITY_CREATE');
    v_perm_act_update    uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'ACTIVITY_UPDATE');
    v_perm_act_exec      uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'ACTIVITY_EXECUTE');
    v_perm_sd_create     uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'SITE_DIARY_CREATE');
    v_perm_sd_update     uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'SITE_DIARY_UPDATE');
    v_perm_wf_manage     uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'WORKFORCE_MANAGE');
    v_perm_prog_edit     uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'PROGRESS_EDIT');
    v_perm_prog_verify   uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'PROGRESS_VERIFY');
    v_perm_prog_approve  uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'PROGRESS_APPROVE');
    v_perm_trade_manage  uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'TRADE_LIBRARY_MANAGE');
    v_perm_vo_create     uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'VO_ITEM_CREATE');
BEGIN
    -- SYSTEM_ADMIN: All 26 canonical permissions
    INSERT INTO "public"."role_permission" (role_id, permission_id) VALUES
        (v_sys_admin, v_perm_prog_mem_manage),
        (v_sys_admin, v_perm_prog_update),
        (v_sys_admin, v_perm_sd_app_req),
        (v_sys_admin, v_perm_sd_app_rev),
        (v_sys_admin, v_perm_sd_app_app),
        (v_sys_admin, v_perm_sd_app_ret),
        (v_sys_admin, v_perm_sd_app_rej),
        (v_sys_admin, v_perm_sd_app_can),
        (v_sys_admin, v_perm_sd_app_queue),
        (v_sys_admin, v_perm_sd_print),
        (v_sys_admin, v_perm_prog_create),
        (v_sys_admin, v_perm_prog_archive),
        (v_sys_admin, v_perm_rev_import),
        (v_sys_admin, v_perm_rev_approve),
        (v_sys_admin, v_perm_task_update),
        (v_sys_admin, v_perm_act_create),
        (v_sys_admin, v_perm_act_update),
        (v_sys_admin, v_perm_act_exec),
        (v_sys_admin, v_perm_sd_create),
        (v_sys_admin, v_perm_sd_update),
        (v_sys_admin, v_perm_wf_manage),
        (v_sys_admin, v_perm_prog_edit),
        (v_sys_admin, v_perm_prog_verify),
        (v_sys_admin, v_perm_prog_approve),
        (v_sys_admin, v_perm_trade_manage),
        (v_sys_admin, v_perm_vo_create)
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- HQ_ADMIN: All 26 canonical permissions (explicit override catalogue)
    INSERT INTO "public"."role_permission" (role_id, permission_id) VALUES
        (v_hq_admin, v_perm_prog_mem_manage),
        (v_hq_admin, v_perm_prog_update),
        (v_hq_admin, v_perm_sd_app_req),
        (v_hq_admin, v_perm_sd_app_rev),
        (v_hq_admin, v_perm_sd_app_app),
        (v_hq_admin, v_perm_sd_app_ret),
        (v_hq_admin, v_perm_sd_app_rej),
        (v_hq_admin, v_perm_sd_app_can),
        (v_hq_admin, v_perm_sd_app_queue),
        (v_hq_admin, v_perm_sd_print),
        (v_hq_admin, v_perm_prog_create),
        (v_hq_admin, v_perm_prog_archive),
        (v_hq_admin, v_perm_rev_import),
        (v_hq_admin, v_perm_rev_approve),
        (v_hq_admin, v_perm_task_update),
        (v_hq_admin, v_perm_act_create),
        (v_hq_admin, v_perm_act_update),
        (v_hq_admin, v_perm_act_exec),
        (v_hq_admin, v_perm_sd_create),
        (v_hq_admin, v_perm_sd_update),
        (v_hq_admin, v_perm_wf_manage),
        (v_hq_admin, v_perm_prog_edit),
        (v_hq_admin, v_perm_prog_verify),
        (v_hq_admin, v_perm_prog_approve),
        (v_hq_admin, v_perm_trade_manage),
        (v_hq_admin, v_perm_vo_create)
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- PLANNER: REVISION_IMPORT, TASK_UPDATE (NO REVISION_APPROVE)
    INSERT INTO "public"."role_permission" (role_id, permission_id) VALUES
        (v_planner, v_perm_rev_import),
        (v_planner, v_perm_task_update)
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- SUPERINTENDING_OFFICER: REVISION_APPROVE, PROGRAMME_UPDATE, PROGRESS_APPROVE
    INSERT INTO "public"."role_permission" (role_id, permission_id) VALUES
        (v_so, v_perm_rev_approve),
        (v_so, v_perm_prog_update),
        (v_so, v_perm_prog_approve)
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- RESIDENT_ENGINEER: ACTIVITY_UPDATE, PROGRESS_VERIFY
    INSERT INTO "public"."role_permission" (role_id, permission_id) VALUES
        (v_re, v_perm_act_update),
        (v_re, v_perm_prog_verify)
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- ASSISTANT_ENGINEER: PROGRESS_VERIFY
    INSERT INTO "public"."role_permission" (role_id, permission_id) VALUES
        (v_ae, v_perm_prog_verify)
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- SITE_ENGINEER: ACTIVITY_CREATE, ACTIVITY_UPDATE, ACTIVITY_EXECUTE, SITE_DIARY_CREATE, SITE_DIARY_UPDATE, WORKFORCE_MANAGE, PROGRESS_EDIT
    INSERT INTO "public"."role_permission" (role_id, permission_id) VALUES
        (v_se, v_perm_act_create),
        (v_se, v_perm_act_update),
        (v_se, v_perm_act_exec),
        (v_se, v_perm_sd_create),
        (v_se, v_perm_sd_update),
        (v_se, v_perm_wf_manage),
        (v_se, v_perm_prog_edit)
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- SITE_SUPERVISOR: ACTIVITY_CREATE, ACTIVITY_UPDATE, ACTIVITY_EXECUTE, SITE_DIARY_CREATE, SITE_DIARY_UPDATE, WORKFORCE_MANAGE, PROGRESS_EDIT
    INSERT INTO "public"."role_permission" (role_id, permission_id) VALUES
        (v_ss, v_perm_act_create),
        (v_ss, v_perm_act_update),
        (v_ss, v_perm_act_exec),
        (v_ss, v_perm_sd_create),
        (v_ss, v_perm_sd_update),
        (v_ss, v_perm_wf_manage),
        (v_ss, v_perm_prog_edit)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
END;
$$;

-- ============================================================
-- 5. Private Global Authority Helper: assert_global_capability
-- ============================================================

CREATE OR REPLACE FUNCTION "private"."assert_global_capability"(
    p_actor_id uuid,
    p_permission_code character varying(100)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_authorized boolean;
BEGIN
    -- 1. Actor must bind to auth.uid()
    PERFORM "private"."a27_assert_actor"(p_actor_id);

    -- 2. Check global capability
    SELECT EXISTS (
        SELECT 1
        FROM "public"."user_profile" up
        JOIN "public"."role" r ON up.global_role_id = r.role_id
        JOIN "public"."role_permission" rp ON r.role_id = rp.role_id
        JOIN "public"."permission" p ON rp.permission_id = p.permission_id
        WHERE up.user_id = p_actor_id
          AND up.is_active = true
          AND up.global_role_id IS NOT NULL
          AND r.is_active = true
          AND r.scope = 'Global'
          AND p.permission_code = p_permission_code
          AND p.is_active = true
    ) INTO v_authorized;

    IF NOT v_authorized THEN
        RAISE EXCEPTION 'F3_UNAUTHORIZED_GLOBAL_CAPABILITY' USING ERRCODE = 'PT403';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION "private"."assert_global_capability"(uuid, character varying) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 6. Canonical Combined Authority Helper: assert_authority
-- ============================================================

CREATE OR REPLACE FUNCTION "private"."assert_authority"(
    p_actor_id uuid,
    p_programme_id uuid,
    p_permission_code character varying(100)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_authorized boolean;
BEGIN
    -- 1. Actor must bind to auth.uid()
    PERFORM "private"."a27_assert_actor"(p_actor_id);

    -- 2. Check authority: Programme capability OR Global capability
    SELECT (
        -- Path A: Active Programme Role Permission
        EXISTS (
            SELECT 1
            FROM "public"."user_profile" up
            JOIN "public"."programme_membership" pm ON up.user_id = pm.user_id
            JOIN "public"."role" r ON pm.role_id = r.role_id
            JOIN "public"."role_permission" rp ON r.role_id = rp.role_id
            JOIN "public"."permission" p ON rp.permission_id = p.permission_id
            WHERE up.user_id = p_actor_id
              AND up.is_active = true
              AND pm.programme_id = p_programme_id
              AND pm.is_active = true
              AND r.is_active = true
              AND r.scope = 'Programme'
              AND p.permission_code = p_permission_code
              AND p.is_active = true
        )
        OR
        -- Path B: Active Global Role Permission
        EXISTS (
            SELECT 1
            FROM "public"."user_profile" up
            JOIN "public"."role" r ON up.global_role_id = r.role_id
            JOIN "public"."role_permission" rp ON r.role_id = rp.role_id
            JOIN "public"."permission" p ON rp.permission_id = p.permission_id
            WHERE up.user_id = p_actor_id
              AND up.is_active = true
              AND up.global_role_id IS NOT NULL
              AND r.is_active = true
              AND r.scope = 'Global'
              AND p.permission_code = p_permission_code
              AND p.is_active = true
        )
    ) INTO v_authorized;

    IF NOT v_authorized THEN
        RAISE EXCEPTION 'F3_UNAUTHORIZED_AUTHORITY' USING ERRCODE = 'PT403';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION "private"."assert_authority"(uuid, uuid, character varying) FROM PUBLIC, anon, authenticated;

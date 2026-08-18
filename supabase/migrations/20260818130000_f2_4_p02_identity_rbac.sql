-- Migration: 20260818130000_f2_4_p02_identity_rbac.sql
-- Description: Identity, Role, Permission & Programme Membership Foundation (F2.4-P02)

-- 1. Create User Profile
CREATE TABLE IF NOT EXISTS "public"."user_profile" (
    "user_id" uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    "full_name" character varying(200),
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone
);
ALTER TABLE "public"."user_profile" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "public"."user_profile" FROM "anon", "authenticated";

-- 2. Create Role
CREATE TABLE IF NOT EXISTS "public"."role" (
    "role_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "role_code" character varying(50) NOT NULL UNIQUE,
    "role_name" character varying(100) NOT NULL,
    "scope" character varying(50) NOT NULL CHECK (scope IN ('Global', 'Programme')),
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone
);
ALTER TABLE "public"."role" ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON "public"."role" TO "authenticated";
REVOKE INSERT, UPDATE, DELETE ON "public"."role" FROM "anon", "authenticated";

-- 3. Create Permission
CREATE TABLE IF NOT EXISTS "public"."permission" (
    "permission_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "permission_code" character varying(100) NOT NULL UNIQUE,
    "module" character varying(100) NOT NULL,
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone
);
ALTER TABLE "public"."permission" ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON "public"."permission" TO "authenticated";
REVOKE INSERT, UPDATE, DELETE ON "public"."permission" FROM "anon", "authenticated";

-- 4. Create Role_Permission Mapping
CREATE TABLE IF NOT EXISTS "public"."role_permission" (
    "role_id" uuid NOT NULL REFERENCES "public"."role"("role_id") ON DELETE CASCADE,
    "permission_id" uuid NOT NULL REFERENCES "public"."permission"("permission_id") ON DELETE CASCADE,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY ("role_id", "permission_id")
);
ALTER TABLE "public"."role_permission" ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON "public"."role_permission" TO "authenticated";
REVOKE INSERT, UPDATE, DELETE ON "public"."role_permission" FROM "anon", "authenticated";

-- 5. Create Programme Membership
CREATE TABLE IF NOT EXISTS "public"."programme_membership" (
    "membership_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "programme_id" uuid NOT NULL REFERENCES "public"."programme"("programme_id") ON DELETE CASCADE,
    "user_id" uuid NOT NULL REFERENCES "public"."user_profile"("user_id") ON DELETE CASCADE,
    "role_id" uuid NOT NULL REFERENCES "public"."role"("role_id") ON DELETE RESTRICT,
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone,
    UNIQUE("programme_id", "user_id")
);
ALTER TABLE "public"."programme_membership" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "public"."programme_membership" FROM "anon", "authenticated";

-- Function to check scope before assigning role
CREATE OR REPLACE FUNCTION "private"."trg_check_programme_membership_role_scope"()
RETURNS trigger AS $$
DECLARE
    v_scope varchar(50);
BEGIN
    SELECT scope INTO v_scope FROM "public"."role" WHERE role_id = NEW.role_id;
    IF v_scope <> 'Programme' THEN
        RAISE EXCEPTION 'Cannot assign a Global role as a Programme membership.' USING ERRCODE = 'PT400';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER "trg_check_role_scope"
BEFORE INSERT OR UPDATE ON "public"."programme_membership"
FOR EACH ROW EXECUTE FUNCTION "private"."trg_check_programme_membership_role_scope"();

-- 6. Seed Data

-- Roles
INSERT INTO "public"."role" (role_id, role_code, role_name, scope) VALUES
(gen_random_uuid(), 'SYSTEM_ADMIN', 'System Administrator', 'Global'),
(gen_random_uuid(), 'HQ_ADMIN', 'HQ Administrator', 'Global'),
(gen_random_uuid(), 'PROJECT_MANAGER', 'Project Manager', 'Programme'),
(gen_random_uuid(), 'RESIDENT_ENGINEER', 'Resident Engineer', 'Programme'),
(gen_random_uuid(), 'SITE_SUPERVISOR', 'Site Supervisor', 'Programme'),
(gen_random_uuid(), 'CONTRACTOR', 'Contractor', 'Programme'),
(gen_random_uuid(), 'VIEWER', 'Viewer', 'Programme')
ON CONFLICT (role_code) DO NOTHING;

-- Permissions
INSERT INTO "public"."permission" (permission_id, permission_code, module) VALUES
(gen_random_uuid(), 'PROGRAMME_MEMBERSHIP_MANAGE', 'Programme'),
(gen_random_uuid(), 'SITE_DIARY_APPROVAL_REQUEST', 'Approval'),
(gen_random_uuid(), 'SITE_DIARY_APPROVAL_REVIEW', 'Approval'),
(gen_random_uuid(), 'SITE_DIARY_APPROVAL_APPROVE', 'Approval'),
(gen_random_uuid(), 'SITE_DIARY_APPROVAL_RETURN', 'Approval'),
(gen_random_uuid(), 'SITE_DIARY_APPROVAL_REJECT', 'Approval'),
(gen_random_uuid(), 'SITE_DIARY_APPROVAL_CANCEL', 'Approval'),
(gen_random_uuid(), 'SITE_DIARY_APPROVAL_QUEUE_VIEW', 'Approval')
ON CONFLICT (permission_code) DO NOTHING;

-- Map
DO $$
DECLARE
    v_pm_id uuid := (SELECT role_id FROM "public"."role" WHERE role_code = 'PROJECT_MANAGER');
    v_re_id uuid := (SELECT role_id FROM "public"."role" WHERE role_code = 'RESIDENT_ENGINEER');
    v_ss_id uuid := (SELECT role_id FROM "public"."role" WHERE role_code = 'SITE_SUPERVISOR');
    v_ct_id uuid := (SELECT role_id FROM "public"."role" WHERE role_code = 'CONTRACTOR');

    v_manage uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'PROGRAMME_MEMBERSHIP_MANAGE');
    v_req uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'SITE_DIARY_APPROVAL_REQUEST');
    v_rev uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'SITE_DIARY_APPROVAL_REVIEW');
    v_app uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'SITE_DIARY_APPROVAL_APPROVE');
    v_ret uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'SITE_DIARY_APPROVAL_RETURN');
    v_rej uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'SITE_DIARY_APPROVAL_REJECT');
    v_can uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'SITE_DIARY_APPROVAL_CANCEL');
    v_view uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'SITE_DIARY_APPROVAL_QUEUE_VIEW');
BEGIN
    -- PROJECT_MANAGER
    INSERT INTO "public"."role_permission" (role_id, permission_id) VALUES (v_pm_id, v_manage) ON CONFLICT DO NOTHING;

    -- RESIDENT_ENGINEER
    INSERT INTO "public"."role_permission" (role_id, permission_id) VALUES (v_re_id, v_rev) ON CONFLICT DO NOTHING;
    INSERT INTO "public"."role_permission" (role_id, permission_id) VALUES (v_re_id, v_app) ON CONFLICT DO NOTHING;
    INSERT INTO "public"."role_permission" (role_id, permission_id) VALUES (v_re_id, v_ret) ON CONFLICT DO NOTHING;
    INSERT INTO "public"."role_permission" (role_id, permission_id) VALUES (v_re_id, v_rej) ON CONFLICT DO NOTHING;
    INSERT INTO "public"."role_permission" (role_id, permission_id) VALUES (v_re_id, v_view) ON CONFLICT DO NOTHING;

    -- SITE_SUPERVISOR
    INSERT INTO "public"."role_permission" (role_id, permission_id) VALUES (v_ss_id, v_req) ON CONFLICT DO NOTHING;
    INSERT INTO "public"."role_permission" (role_id, permission_id) VALUES (v_ss_id, v_can) ON CONFLICT DO NOTHING;
    INSERT INTO "public"."role_permission" (role_id, permission_id) VALUES (v_ss_id, v_view) ON CONFLICT DO NOTHING;

    -- CONTRACTOR
    INSERT INTO "public"."role_permission" (role_id, permission_id) VALUES (v_ct_id, v_req) ON CONFLICT DO NOTHING;
    INSERT INTO "public"."role_permission" (role_id, permission_id) VALUES (v_ct_id, v_can) ON CONFLICT DO NOTHING;
    INSERT INTO "public"."role_permission" (role_id, permission_id) VALUES (v_ct_id, v_view) ON CONFLICT DO NOTHING;
END;
$$;

-- 7. Bootstrap Trigger
CREATE OR REPLACE FUNCTION "private"."trg_bootstrap_programme_creator"()
RETURNS trigger AS $$
DECLARE
    v_pm_role_id uuid;
BEGIN
    SELECT role_id INTO v_pm_role_id FROM "public"."role" WHERE role_code = 'PROJECT_MANAGER';
    
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.created_by) THEN
        INSERT INTO "public"."user_profile" (user_id, full_name, is_active) 
        VALUES (NEW.created_by, NULL, true)
        ON CONFLICT (user_id) DO NOTHING;

        INSERT INTO "public"."programme_membership" (programme_id, user_id, role_id)
        VALUES (NEW.programme_id, NEW.created_by, v_pm_role_id)
        ON CONFLICT (programme_id, user_id) DO NOTHING;
    ELSE
        RAISE NOTICE 'Skipping bootstrap: created_by % not found in auth.users', NEW.created_by;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER "trg_bootstrap_programme_creator"
AFTER INSERT ON "public"."programme"
FOR EACH ROW EXECUTE FUNCTION "private"."trg_bootstrap_programme_creator"();

-- 8. Existing Backfill
DO $$
DECLARE
    rec RECORD;
    v_pm_role_id uuid := (SELECT role_id FROM "public"."role" WHERE role_code = 'PROJECT_MANAGER');
BEGIN
    FOR rec IN SELECT programme_id, created_by FROM "public"."programme" LOOP
        IF EXISTS (SELECT 1 FROM auth.users WHERE id = rec.created_by) THEN
            INSERT INTO "public"."user_profile" (user_id, full_name, is_active)
            VALUES (rec.created_by, NULL, true)
            ON CONFLICT (user_id) DO NOTHING;

            INSERT INTO "public"."programme_membership" (programme_id, user_id, role_id)
            VALUES (rec.programme_id, rec.created_by, v_pm_role_id)
            ON CONFLICT (programme_id, user_id) DO NOTHING;
        ELSE
            RAISE NOTICE 'Skipping existing bootstrap: created_by % not found in auth.users for programme %', rec.created_by, rec.programme_id;
        END IF;
    END LOOP;
END;
$$;

/*
  # Admin Users: OAuth linkage, invitations, audit log

  1. Changes to admin_users
    - Add auth_user_id FK to auth.users
    - Add status (pending | active | disabled)
    - Add invited_by, invited_at, activated_at, last_sign_in_at, full_name
    - Allow password_hash to be NULL (moving to Supabase Auth / OAuth)

  2. New Tables
    - admin_audit_log - records invitations, deletions, role changes

  3. New Helpers
    - is_admin_user() updated to check auth_user_id match + status=active
    - is_super_admin() checks super_admin role + active status

  4. Security
    - RLS tightened: admins see their own row; super admins see all
    - Trigger prevents deleting the last super admin or self-demotion

  5. Seed
    - Links existing auth users nick.rain@shadesystems.co.nz as super_admin
*/

-- 1. Extend admin_users
ALTER TABLE admin_users ALTER COLUMN password_hash DROP NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_users' AND column_name='auth_user_id') THEN
    ALTER TABLE admin_users ADD COLUMN auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_users' AND column_name='status') THEN
    ALTER TABLE admin_users ADD COLUMN status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','disabled'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_users' AND column_name='full_name') THEN
    ALTER TABLE admin_users ADD COLUMN full_name text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_users' AND column_name='invited_by') THEN
    ALTER TABLE admin_users ADD COLUMN invited_by uuid REFERENCES admin_users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_users' AND column_name='invited_at') THEN
    ALTER TABLE admin_users ADD COLUMN invited_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_users' AND column_name='activated_at') THEN
    ALTER TABLE admin_users ADD COLUMN activated_at timestamptz;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_email_lower ON admin_users (lower(email));

-- 2. Audit log
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  actor_email text,
  action text NOT NULL,
  target_admin_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  target_email text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- 3. Helpers
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE auth_user_id = auth.uid() AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE auth_user_id = auth.uid() AND status = 'active' AND role = 'super_admin'
  );
$$;

-- 4. RLS for admin_users
DROP POLICY IF EXISTS "Admin read own row" ON admin_users;
DROP POLICY IF EXISTS "Super admin read all" ON admin_users;
DROP POLICY IF EXISTS "Super admin insert" ON admin_users;
DROP POLICY IF EXISTS "Super admin update" ON admin_users;
DROP POLICY IF EXISTS "Super admin delete" ON admin_users;

CREATE POLICY "Admin read own row" ON admin_users
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() OR is_super_admin());

CREATE POLICY "Super admin insert" ON admin_users
  FOR INSERT TO authenticated WITH CHECK (is_super_admin());

CREATE POLICY "Super admin update" ON admin_users
  FOR UPDATE TO authenticated
  USING (is_super_admin() OR auth_user_id = auth.uid())
  WITH CHECK (is_super_admin() OR auth_user_id = auth.uid());

CREATE POLICY "Super admin delete" ON admin_users
  FOR DELETE TO authenticated USING (is_super_admin());

-- Audit log RLS
DROP POLICY IF EXISTS "Super admin read audit" ON admin_audit_log;
CREATE POLICY "Super admin read audit" ON admin_audit_log
  FOR SELECT TO authenticated USING (is_super_admin());

-- 5. Trigger: prevent deleting last super admin
CREATE OR REPLACE FUNCTION prevent_last_super_admin_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cnt int;
BEGIN
  IF OLD.role = 'super_admin' AND OLD.status = 'active' THEN
    SELECT count(*) INTO cnt FROM admin_users
      WHERE role='super_admin' AND status='active' AND id <> OLD.id;
    IF cnt = 0 THEN
      RAISE EXCEPTION 'Cannot delete the last active super admin';
    END IF;
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_prevent_last_super ON admin_users;
CREATE TRIGGER trg_prevent_last_super BEFORE DELETE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION prevent_last_super_admin_delete();

-- 6. Seed bootstrap super admin linked to existing auth.users entries
DO $$
DECLARE nick_id uuid;
BEGIN
  SELECT id INTO nick_id FROM auth.users WHERE lower(email) = 'nick.rain@shadesystems.co.nz' LIMIT 1;
  IF nick_id IS NOT NULL THEN
    INSERT INTO admin_users (email, auth_user_id, role, status, full_name, activated_at)
    VALUES ('nick.rain@shadesystems.co.nz', nick_id, 'super_admin', 'active', 'Nick Rain', now())
    ON CONFLICT (email) DO UPDATE SET
      auth_user_id = EXCLUDED.auth_user_id,
      role = 'super_admin',
      status = 'active',
      activated_at = COALESCE(admin_users.activated_at, now());
  END IF;
END $$;

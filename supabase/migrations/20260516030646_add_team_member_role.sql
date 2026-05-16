/*
  # Add team_member role to admin system

  1. Changes
    - Extends the `admin_users.role` check constraint to include 'team_member'
    - Adds `allowed_for_team_member` column to `admin_tab_permissions`
      (defaults to false so super admins must explicitly enable tabs)
    - Updates existing permission rows with the new column

  2. Security
    - Team members have no tab access by default until super admin enables it
    - Existing admin/super_admin behavior unchanged

  3. Notes
    - Team members sign in with email/password (not Google OAuth)
    - Tab access controlled via the new `allowed_for_team_member` column
*/

-- Extend role constraint to include team_member
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check
  CHECK (role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'team_member'::text]));

-- Add team_member permission column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_tab_permissions' AND column_name = 'allowed_for_team_member'
  ) THEN
    ALTER TABLE admin_tab_permissions ADD COLUMN allowed_for_team_member boolean NOT NULL DEFAULT false;
  END IF;
END $$;

/*
  # Create admin tab permissions system

  1. New Tables
    - `admin_tab_permissions`
      - `id` (uuid, primary key)
      - `tab_id` (text, not null) - matches the tab key in the dashboard
      - `tab_label` (text, not null) - human-readable label
      - `allowed_for_admin` (boolean, default true) - whether regular admins can access
      - `updated_at` (timestamptz)
      - `updated_by` (uuid, FK to admin_users)

  2. Security
    - RLS enabled
    - All authenticated admins can SELECT (they need to know which tabs to show)
    - Only super_admin can UPDATE

  3. Seed Data
    - All restrictable tabs seeded with allowed_for_admin = true (full access by default)
    - 'overview' and 'team' are not included as they are always accessible
*/

CREATE TABLE IF NOT EXISTS admin_tab_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tab_id text UNIQUE NOT NULL,
  tab_label text NOT NULL,
  allowed_for_admin boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES admin_users(id) ON DELETE SET NULL
);

ALTER TABLE admin_tab_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated admins can read tab permissions"
  ON admin_tab_permissions
  FOR SELECT
  TO authenticated
  USING (is_admin_user() OR is_super_admin());

CREATE POLICY "Super admins can update tab permissions"
  ON admin_tab_permissions
  FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

INSERT INTO admin_tab_permissions (tab_id, tab_label, allowed_for_admin) VALUES
  ('quotes', 'Saved Quotes', true),
  ('events', 'User Events', true),
  ('funnel', 'Funnel & Insights', true),
  ('fabrics', 'Fabrics & Colors', true),
  ('hardware', 'Hardware Catalog', true),
  ('pricing', 'Currency Pricing', true),
  ('base-pricing', 'Base Pricing', true),
  ('exports', 'Data Export', true),
  ('email', 'Email Studio', true),
  ('pdf', 'PDF Studio', true),
  ('exclusions', 'Exclusion Settings', true)
ON CONFLICT (tab_id) DO NOTHING;

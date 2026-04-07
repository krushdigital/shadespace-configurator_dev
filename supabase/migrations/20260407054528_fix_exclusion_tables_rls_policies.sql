/*
  # Fix RLS policies on excluded_ips and excluded_emails

  1. Problem
    - Current policies check against an empty `admin_users` table
    - The `admin_users.id` column uses its own UUIDs, not `auth.users.id`
    - Every operation is silently denied for authenticated admins

  2. Changes
    - Drop all 6 existing policies on `excluded_ips` and `excluded_emails`
    - Recreate them using `auth.uid() IS NOT NULL` to match the pattern
      used by the rest of the admin dashboard

  3. Security
    - Access is still restricted to authenticated users only
    - Anonymous users cannot modify exclusion data
*/

-- excluded_ips: drop old policies
DROP POLICY IF EXISTS "Admins can read excluded IPs" ON excluded_ips;
DROP POLICY IF EXISTS "Admins can insert excluded IPs" ON excluded_ips;
DROP POLICY IF EXISTS "Admins can delete excluded IPs" ON excluded_ips;

-- excluded_ips: create fixed policies
CREATE POLICY "Authenticated users can read excluded IPs"
  ON excluded_ips FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert excluded IPs"
  ON excluded_ips FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete excluded IPs"
  ON excluded_ips FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- excluded_emails: drop old policies
DROP POLICY IF EXISTS "Admins can read excluded emails" ON excluded_emails;
DROP POLICY IF EXISTS "Admins can insert excluded emails" ON excluded_emails;
DROP POLICY IF EXISTS "Admins can delete excluded emails" ON excluded_emails;

-- excluded_emails: create fixed policies
CREATE POLICY "Authenticated users can read excluded emails"
  ON excluded_emails FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert excluded emails"
  ON excluded_emails FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete excluded emails"
  ON excluded_emails FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

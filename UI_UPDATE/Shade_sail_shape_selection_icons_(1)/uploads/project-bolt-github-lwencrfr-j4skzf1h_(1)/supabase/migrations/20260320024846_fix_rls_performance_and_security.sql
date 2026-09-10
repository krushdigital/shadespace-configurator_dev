/*
  # Fix RLS Performance and Security Issues

  1. Performance Improvements
    - Replace `auth.uid()` with `(select auth.uid())` in all authenticated RLS policies
      to prevent per-row re-evaluation. Affected tables:
      - `pricing_change_log` (3 policies)
      - `hardware_costs` (4 policies)
      - `edge_features` (4 policies)
      - `fabric_types` (4 policies)
      - `fabric_pricing` (4 policies)
      - `corner_costs` (4 policies)

  2. Unused Index Removal
    - Drop `idx_pricing_change_log_table` (never used)

  3. Security Fixes
    - Remove `Anon can insert pricing change log` policy (always-true WITH CHECK).
      The base-pricing edge function uses service_role_key which bypasses RLS,
      so this anon INSERT policy is unnecessary and exposes the table to abuse.

  4. Notes (not addressed in this migration)
    - Tables `currency_detection_logs`, `rate_limit_counters`, `user_sessions` have
      always-true anon policies but are managed by an external `detect-currency` edge
      function whose code is not in this repository. Changing these policies could
      break that function.
    - `user_guidance_preferences` uses always-true policies by design for anonymous
      device-fingerprint-based access. Column constraints (NOT NULL, UNIQUE) provide
      the primary protection.
    - Auth DB connection strategy and leaked password protection are project-level
      settings that must be changed in the Supabase dashboard.
*/

-- ============================================================
-- 1. Drop unused index
-- ============================================================
DROP INDEX IF EXISTS idx_pricing_change_log_table;

-- ============================================================
-- 2. Remove insecure anon INSERT on pricing_change_log
-- ============================================================
DROP POLICY IF EXISTS "Anon can insert pricing change log" ON pricing_change_log;

-- ============================================================
-- 3. Recreate authenticated policies with (select auth.uid())
-- ============================================================

-- pricing_change_log
DROP POLICY IF EXISTS "Authenticated can read pricing change log" ON pricing_change_log;
CREATE POLICY "Authenticated can read pricing change log"
  ON pricing_change_log FOR SELECT TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can insert pricing change log" ON pricing_change_log;
CREATE POLICY "Authenticated can insert pricing change log"
  ON pricing_change_log FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can update pricing change log" ON pricing_change_log;
CREATE POLICY "Authenticated can update pricing change log"
  ON pricing_change_log FOR UPDATE TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- hardware_costs
DROP POLICY IF EXISTS "Authenticated can read hardware costs" ON hardware_costs;
CREATE POLICY "Authenticated can read hardware costs"
  ON hardware_costs FOR SELECT TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can insert hardware costs" ON hardware_costs;
CREATE POLICY "Authenticated can insert hardware costs"
  ON hardware_costs FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can update hardware costs" ON hardware_costs;
CREATE POLICY "Authenticated can update hardware costs"
  ON hardware_costs FOR UPDATE TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can delete hardware costs" ON hardware_costs;
CREATE POLICY "Authenticated can delete hardware costs"
  ON hardware_costs FOR DELETE TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- edge_features
DROP POLICY IF EXISTS "Authenticated can read edge features" ON edge_features;
CREATE POLICY "Authenticated can read edge features"
  ON edge_features FOR SELECT TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can insert edge features" ON edge_features;
CREATE POLICY "Authenticated can insert edge features"
  ON edge_features FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can update edge features" ON edge_features;
CREATE POLICY "Authenticated can update edge features"
  ON edge_features FOR UPDATE TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can delete edge features" ON edge_features;
CREATE POLICY "Authenticated can delete edge features"
  ON edge_features FOR DELETE TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- fabric_types
DROP POLICY IF EXISTS "Authenticated can read all fabric types" ON fabric_types;
CREATE POLICY "Authenticated can read all fabric types"
  ON fabric_types FOR SELECT TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can insert fabric types" ON fabric_types;
CREATE POLICY "Authenticated can insert fabric types"
  ON fabric_types FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can update fabric types" ON fabric_types;
CREATE POLICY "Authenticated can update fabric types"
  ON fabric_types FOR UPDATE TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can delete fabric types" ON fabric_types;
CREATE POLICY "Authenticated can delete fabric types"
  ON fabric_types FOR DELETE TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- fabric_pricing
DROP POLICY IF EXISTS "Authenticated can read fabric pricing" ON fabric_pricing;
CREATE POLICY "Authenticated can read fabric pricing"
  ON fabric_pricing FOR SELECT TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can insert fabric pricing" ON fabric_pricing;
CREATE POLICY "Authenticated can insert fabric pricing"
  ON fabric_pricing FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can update fabric pricing" ON fabric_pricing;
CREATE POLICY "Authenticated can update fabric pricing"
  ON fabric_pricing FOR UPDATE TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can delete fabric pricing" ON fabric_pricing;
CREATE POLICY "Authenticated can delete fabric pricing"
  ON fabric_pricing FOR DELETE TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- corner_costs
DROP POLICY IF EXISTS "Authenticated can read corner costs" ON corner_costs;
CREATE POLICY "Authenticated can read corner costs"
  ON corner_costs FOR SELECT TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can insert corner costs" ON corner_costs;
CREATE POLICY "Authenticated can insert corner costs"
  ON corner_costs FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can update corner costs" ON corner_costs;
CREATE POLICY "Authenticated can update corner costs"
  ON corner_costs FOR UPDATE TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can delete corner costs" ON corner_costs;
CREATE POLICY "Authenticated can delete corner costs"
  ON corner_costs FOR DELETE TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

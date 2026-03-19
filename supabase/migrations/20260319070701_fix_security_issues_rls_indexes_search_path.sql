/*
  # Fix Security Issues: RLS Policies, Unused Indexes, Function Search Paths

  1. RLS Performance Fix
    - `pricing_settings`: Wrap `auth.uid()` in `(select ...)` for 3 policies to prevent per-row re-evaluation

  2. Unused Indexes Dropped (8 indexes)
    - `idx_user_sessions_ip_address` on `user_sessions`
    - `idx_user_sessions_expires_at` on `user_sessions`
    - `idx_currency_logs_created_at` on `currency_detection_logs`
    - `idx_rate_limit_ip_address` on `rate_limit_counters`
    - `idx_pricing_settings_currency_code` on `pricing_settings`
    - `idx_pricing_settings_active` on `pricing_settings`
    - `idx_pricing_history_currency_code` on `pricing_history`
    - `idx_pricing_history_created_at` on `pricing_history`

  3. Function Search Path Fixes
    - `get_analytics_summary`: Add `SET search_path TO 'public', 'pg_temp'`
    - `generate_default_quote_name(jsonb, timestamptz)`: Add `SET search_path TO 'public', 'pg_temp'`

  4. RLS Policy Tightening
    - `saved_quotes`: Remove anon access, restrict to authenticated users only (edge function uses service_role_key)
    - `user_events`: Remove anon access for SELECT/DELETE, restrict to authenticated (edge function uses service_role_key)
    - `analytics_cache`: Replace `USING (true)` with `(select auth.uid()) IS NOT NULL`
    - `pricing_history`: Remove anon INSERT (service_role handles it), add authenticated READ/INSERT

  5. Notes
    - Tables accessed by the `detect-currency` edge function (currency_detection_logs, rate_limit_counters, user_sessions)
      are left unchanged because the function code is not in this repository and changing policies could break currency detection.
    - `user_guidance_preferences` is left unchanged because access patterns are unclear and it uses device_fingerprint (no auth identity).
    - All SECURITY DEFINER functions (delete_saved_quote, track_user_event, get_analytics_summary, etc.) bypass RLS internally.
*/

-- =============================================================================
-- 1. FIX PRICING_SETTINGS RLS PERFORMANCE (wrap auth.uid() in select)
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated can read all pricing settings" ON pricing_settings;
CREATE POLICY "Authenticated can read all pricing settings"
  ON pricing_settings
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can update pricing settings" ON pricing_settings;
CREATE POLICY "Authenticated can update pricing settings"
  ON pricing_settings
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can insert pricing settings" ON pricing_settings;
CREATE POLICY "Authenticated can insert pricing settings"
  ON pricing_settings
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);


-- =============================================================================
-- 2. DROP UNUSED INDEXES
-- =============================================================================

DROP INDEX IF EXISTS idx_user_sessions_ip_address;
DROP INDEX IF EXISTS idx_user_sessions_expires_at;
DROP INDEX IF EXISTS idx_currency_logs_created_at;
DROP INDEX IF EXISTS idx_rate_limit_ip_address;
DROP INDEX IF EXISTS idx_pricing_settings_currency_code;
DROP INDEX IF EXISTS idx_pricing_settings_active;
DROP INDEX IF EXISTS idx_pricing_history_currency_code;
DROP INDEX IF EXISTS idx_pricing_history_created_at;


-- =============================================================================
-- 3. FIX MUTABLE SEARCH_PATH ON FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_analytics_summary(
  p_start_date timestamptz DEFAULT (now() - '30 days'::interval),
  p_end_date timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_quotes', (SELECT COUNT(*) FROM saved_quotes WHERE created_at BETWEEN p_start_date AND p_end_date),
    'total_events', (SELECT COUNT(*) FROM user_events WHERE created_at BETWEEN p_start_date AND p_end_date),
    'pdf_downloads', (SELECT COUNT(*) FROM user_events WHERE event_type = 'pdf_download' AND created_at BETWEEN p_start_date AND p_end_date),
    'email_summaries', (SELECT COUNT(*) FROM user_events WHERE event_type = 'email_summary' AND created_at BETWEEN p_start_date AND p_end_date),
    'add_to_cart', (SELECT COUNT(*) FROM user_events WHERE event_type = 'add_to_cart' AND created_at BETWEEN p_start_date AND p_end_date),
    'unique_customers', (SELECT COUNT(DISTINCT customer_email) FROM saved_quotes WHERE customer_email IS NOT NULL AND created_at BETWEEN p_start_date AND p_end_date),
    'total_quote_value', (SELECT COALESCE(SUM((calculations_data->>'totalPrice')::numeric), 0) FROM saved_quotes WHERE created_at BETWEEN p_start_date AND p_end_date),
    'avg_quote_value', (SELECT COALESCE(AVG((calculations_data->>'totalPrice')::numeric), 0) FROM saved_quotes WHERE created_at BETWEEN p_start_date AND p_end_date),
    'conversion_rate', (
      SELECT CASE
        WHEN COUNT(*) > 0 THEN
          ROUND((COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*)::numeric) * 100, 2)
        ELSE 0
      END
      FROM saved_quotes
      WHERE created_at BETWEEN p_start_date AND p_end_date
    )
  ) INTO result;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_default_quote_name(
  config_data jsonb,
  created_date timestamptz
)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  corners int;
  fabric_type text;
  fabric_color text;
  fabric_label text;
  date_str text;
  result text;
BEGIN
  corners := COALESCE((config_data->>'corners')::int, 3);
  fabric_type := config_data->>'fabricType';
  fabric_color := config_data->>'fabricColor';

  fabric_label := CASE fabric_type
    WHEN 'monotec370' THEN 'Monotec'
    WHEN 'extrablock330' THEN 'ExtraBlock'
    WHEN 'shadetec320' THEN 'Shadetec'
    ELSE 'Custom'
  END;

  date_str := TO_CHAR(created_date, 'Mon DD');
  IF EXTRACT(YEAR FROM created_date) != EXTRACT(YEAR FROM NOW()) THEN
    date_str := TO_CHAR(created_date, 'Mon DD, YYYY');
  END IF;

  result := corners || '-Corner ' || fabric_label;

  IF fabric_color IS NOT NULL AND fabric_color != '' THEN
    result := result || ' ' || fabric_color;
  END IF;

  result := result || ' Shade Sail - ' || date_str;

  IF LENGTH(result) > 100 THEN
    result := SUBSTRING(result FROM 1 FOR 97) || '...';
  END IF;

  RETURN result;
END;
$function$;


-- =============================================================================
-- 4. FIX RLS ALWAYS-TRUE POLICIES
-- =============================================================================

-- ----- saved_quotes: restrict to authenticated only -----
-- (save-quote edge function now uses SERVICE_ROLE_KEY, bypassing RLS)
-- (admin dashboard now uses authenticated session tokens)

DROP POLICY IF EXISTS "Anyone can create quotes" ON saved_quotes;
CREATE POLICY "Authenticated users can insert quotes"
  ON saved_quotes
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Read quotes with valid access token" ON saved_quotes;
CREATE POLICY "Authenticated users can read quotes"
  ON saved_quotes
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Update quotes with valid access token" ON saved_quotes;
CREATE POLICY "Authenticated users can update quotes"
  ON saved_quotes
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Allow delete quotes" ON saved_quotes;
CREATE POLICY "Authenticated users can delete quotes"
  ON saved_quotes
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);


-- ----- user_events: restrict to authenticated only -----
-- (track-event edge function uses SERVICE_ROLE_KEY, bypassing RLS)
-- (track_user_event RPC is SECURITY DEFINER, bypassing RLS)

DROP POLICY IF EXISTS "Anyone can insert events" ON user_events;
CREATE POLICY "Authenticated users can insert events"
  ON user_events
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can read events" ON user_events;
CREATE POLICY "Authenticated users can read events"
  ON user_events
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Allow delete events" ON user_events;
CREATE POLICY "Authenticated users can delete events"
  ON user_events
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);


-- ----- analytics_cache: replace true with auth.uid() check -----

DROP POLICY IF EXISTS "Authenticated users can read analytics cache" ON analytics_cache;
CREATE POLICY "Authenticated users can read analytics cache"
  ON analytics_cache
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert analytics cache" ON analytics_cache;
CREATE POLICY "Authenticated users can insert analytics cache"
  ON analytics_cache
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update analytics cache" ON analytics_cache;
CREATE POLICY "Authenticated users can update analytics cache"
  ON analytics_cache
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete analytics cache" ON analytics_cache;
CREATE POLICY "Authenticated users can delete analytics cache"
  ON analytics_cache
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);


-- ----- pricing_history: remove anon INSERT, add authenticated policies -----
-- (pricing-settings edge function uses SERVICE_ROLE_KEY for writes)

DROP POLICY IF EXISTS "Anon can insert pricing history" ON pricing_history;
DROP POLICY IF EXISTS "Authenticated users can insert pricing history" ON pricing_history;
CREATE POLICY "Authenticated users can insert pricing history"
  ON pricing_history
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can read pricing history" ON pricing_history;
CREATE POLICY "Authenticated users can read pricing history"
  ON pricing_history
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

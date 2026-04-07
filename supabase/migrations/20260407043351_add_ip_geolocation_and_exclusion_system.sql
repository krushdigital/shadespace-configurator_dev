/*
  # Add IP Geolocation Tracking and Internal Traffic Exclusion System

  1. Modified Tables
    - `saved_quotes`
      - `customer_ip` (text) - IP address of the user who created the quote
      - `customer_country` (text) - Country name resolved from IP
      - `customer_country_code` (text) - ISO country code resolved from IP
      - `is_excluded` (boolean) - Flag to mark as internal/test traffic
    - `user_events`
      - `customer_country` (text) - Country name resolved from IP
      - `customer_country_code` (text) - ISO country code resolved from IP
      - `is_excluded` (boolean) - Flag to mark as internal/test traffic

  2. New Tables
    - `excluded_ips` - IP addresses to automatically exclude from analytics
      - `id` (uuid, primary key)
      - `ip_address` (text, unique) - The IP address to exclude
      - `label` (text) - Friendly name (e.g. "Office NZ", "Home")
      - `created_at` (timestamptz)
    - `excluded_emails` - Email addresses/domains to automatically exclude
      - `id` (uuid, primary key)
      - `email_pattern` (text, unique) - Email or domain pattern (e.g. "@company.com")
      - `label` (text) - Friendly name
      - `created_at` (timestamptz)

  3. New Functions
    - `check_exclusion_on_event()` - Trigger function that auto-flags events matching exclusion rules
    - `check_exclusion_on_quote()` - Trigger function that auto-flags quotes matching exclusion rules
    - `refresh_exclusion_flags()` - Bulk-update existing records when exclusion lists change
    - Updated `get_analytics_summary` with optional `p_exclude_internal` parameter
    - Updated `get_event_timeline` with optional `p_exclude_internal` parameter

  4. Security
    - RLS enabled on `excluded_ips` and `excluded_emails`
    - Only authenticated admin users can manage exclusion lists
    - Indexes added for performance on `is_excluded` columns

  5. Important Notes
    - Existing records default to `is_excluded = false`
    - Auto-exclusion triggers fire on INSERT to catch new traffic automatically
    - The `refresh_exclusion_flags()` function can be called to retroactively flag historical data
*/

-- Add columns to saved_quotes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'customer_ip'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN customer_ip text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'customer_country'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN customer_country text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'customer_country_code'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN customer_country_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'is_excluded'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN is_excluded boolean DEFAULT false;
  END IF;
END $$;

-- Add columns to user_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_events' AND column_name = 'customer_country'
  ) THEN
    ALTER TABLE user_events ADD COLUMN customer_country text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_events' AND column_name = 'customer_country_code'
  ) THEN
    ALTER TABLE user_events ADD COLUMN customer_country_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_events' AND column_name = 'is_excluded'
  ) THEN
    ALTER TABLE user_events ADD COLUMN is_excluded boolean DEFAULT false;
  END IF;
END $$;

-- Create excluded_ips table
CREATE TABLE IF NOT EXISTS excluded_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE excluded_ips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read excluded IPs"
  ON excluded_ips FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert excluded IPs"
  ON excluded_ips FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete excluded IPs"
  ON excluded_ips FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Also allow anon access for edge functions using service role
CREATE POLICY "Service role can manage excluded IPs"
  ON excluded_ips FOR SELECT
  TO anon
  USING (true);

-- Create excluded_emails table
CREATE TABLE IF NOT EXISTS excluded_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_pattern text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE excluded_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read excluded emails"
  ON excluded_emails FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert excluded emails"
  ON excluded_emails FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete excluded emails"
  ON excluded_emails FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage excluded emails"
  ON excluded_emails FOR SELECT
  TO anon
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_quotes_is_excluded ON saved_quotes (is_excluded);
CREATE INDEX IF NOT EXISTS idx_user_events_is_excluded ON user_events (is_excluded);
CREATE INDEX IF NOT EXISTS idx_saved_quotes_customer_ip ON saved_quotes (customer_ip);
CREATE INDEX IF NOT EXISTS idx_user_events_customer_ip ON user_events (customer_ip);

-- Trigger function: auto-flag events on insert
CREATE OR REPLACE FUNCTION check_exclusion_on_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_ip text;
BEGIN
  clean_ip := split_part(COALESCE(NEW.customer_ip, ''), ',', 1);
  clean_ip := trim(clean_ip);

  IF clean_ip IS NOT NULL AND clean_ip != '' AND clean_ip != 'unknown' THEN
    IF EXISTS (SELECT 1 FROM excluded_ips WHERE ip_address = clean_ip) THEN
      NEW.is_excluded := true;
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.customer_email IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM excluded_emails
      WHERE NEW.customer_email ILIKE email_pattern
         OR NEW.customer_email ILIKE '%' || email_pattern
    ) THEN
      NEW.is_excluded := true;
      RETURN NEW;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger function: auto-flag quotes on insert
CREATE OR REPLACE FUNCTION check_exclusion_on_quote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_ip text;
BEGIN
  clean_ip := split_part(COALESCE(NEW.customer_ip, ''), ',', 1);
  clean_ip := trim(clean_ip);

  IF clean_ip IS NOT NULL AND clean_ip != '' AND clean_ip != 'unknown' THEN
    IF EXISTS (SELECT 1 FROM excluded_ips WHERE ip_address = clean_ip) THEN
      NEW.is_excluded := true;
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.customer_email IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM excluded_emails
      WHERE NEW.customer_email ILIKE email_pattern
         OR NEW.customer_email ILIKE '%' || email_pattern
    ) THEN
      NEW.is_excluded := true;
      RETURN NEW;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trg_check_exclusion_on_event ON user_events;
CREATE TRIGGER trg_check_exclusion_on_event
  BEFORE INSERT ON user_events
  FOR EACH ROW
  EXECUTE FUNCTION check_exclusion_on_event();

DROP TRIGGER IF EXISTS trg_check_exclusion_on_quote ON saved_quotes;
CREATE TRIGGER trg_check_exclusion_on_quote
  BEFORE INSERT ON saved_quotes
  FOR EACH ROW
  EXECUTE FUNCTION check_exclusion_on_quote();

-- Function to retroactively flag historical records when exclusion lists change
CREATE OR REPLACE FUNCTION refresh_exclusion_flags()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  events_updated integer := 0;
  quotes_updated integer := 0;
BEGIN
  -- Reset all flags first
  UPDATE user_events SET is_excluded = false WHERE is_excluded = true;
  GET DIAGNOSTICS events_updated = ROW_COUNT;

  UPDATE saved_quotes SET is_excluded = false WHERE is_excluded = true;
  GET DIAGNOSTICS quotes_updated = ROW_COUNT;

  -- Re-flag by IP
  UPDATE user_events SET is_excluded = true
  WHERE trim(split_part(COALESCE(customer_ip, ''), ',', 1)) IN (
    SELECT ip_address FROM excluded_ips
  );
  GET DIAGNOSTICS events_updated = ROW_COUNT;

  UPDATE saved_quotes SET is_excluded = true
  WHERE trim(split_part(COALESCE(customer_ip, ''), ',', 1)) IN (
    SELECT ip_address FROM excluded_ips
  );
  GET DIAGNOSTICS quotes_updated = ROW_COUNT;

  -- Re-flag by email
  UPDATE user_events ue SET is_excluded = true
  WHERE ue.is_excluded = false
    AND ue.customer_email IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM excluded_emails ee
      WHERE ue.customer_email ILIKE ee.email_pattern
         OR ue.customer_email ILIKE '%' || ee.email_pattern
    );

  UPDATE saved_quotes sq SET is_excluded = true
  WHERE sq.is_excluded = false
    AND sq.customer_email IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM excluded_emails ee
      WHERE sq.customer_email ILIKE ee.email_pattern
         OR sq.customer_email ILIKE '%' || ee.email_pattern
    );

  RETURN jsonb_build_object(
    'events_flagged', (SELECT COUNT(*) FROM user_events WHERE is_excluded = true),
    'quotes_flagged', (SELECT COUNT(*) FROM saved_quotes WHERE is_excluded = true)
  );
END;
$$;

-- Grant execute to anon for edge function calls
GRANT EXECUTE ON FUNCTION refresh_exclusion_flags() TO anon;

-- Updated get_analytics_summary with exclusion support
DROP FUNCTION IF EXISTS get_analytics_summary(timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION get_analytics_summary(
  p_start_date timestamptz DEFAULT (now() - interval '30 days'),
  p_end_date timestamptz DEFAULT now(),
  p_exclude_internal boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_quotes', (
      SELECT COUNT(*) FROM saved_quotes
      WHERE created_at BETWEEN p_start_date AND p_end_date
        AND (NOT p_exclude_internal OR is_excluded = false)
    ),
    'total_events', (
      SELECT COUNT(*) FROM user_events
      WHERE created_at BETWEEN p_start_date AND p_end_date
        AND (NOT p_exclude_internal OR is_excluded = false)
    ),
    'pdf_downloads', (
      SELECT COUNT(*) FROM user_events
      WHERE event_type = 'pdf_download' AND created_at BETWEEN p_start_date AND p_end_date
        AND (NOT p_exclude_internal OR is_excluded = false)
    ),
    'email_summaries', (
      SELECT COUNT(*) FROM user_events
      WHERE event_type = 'email_summary' AND created_at BETWEEN p_start_date AND p_end_date
        AND (NOT p_exclude_internal OR is_excluded = false)
    ),
    'add_to_cart', (
      SELECT COUNT(*) FROM user_events
      WHERE event_type = 'add_to_cart' AND created_at BETWEEN p_start_date AND p_end_date
        AND (NOT p_exclude_internal OR is_excluded = false)
    ),
    'unique_customers', (
      SELECT COUNT(DISTINCT customer_email) FROM saved_quotes
      WHERE customer_email IS NOT NULL AND created_at BETWEEN p_start_date AND p_end_date
        AND (NOT p_exclude_internal OR is_excluded = false)
    ),
    'total_quote_value', (
      SELECT COALESCE(SUM((calculations_data->>'totalPrice')::numeric), 0) FROM saved_quotes
      WHERE created_at BETWEEN p_start_date AND p_end_date
        AND (NOT p_exclude_internal OR is_excluded = false)
    ),
    'avg_quote_value', (
      SELECT COALESCE(AVG((calculations_data->>'totalPrice')::numeric), 0) FROM saved_quotes
      WHERE created_at BETWEEN p_start_date AND p_end_date
        AND (NOT p_exclude_internal OR is_excluded = false)
    ),
    'conversion_rate', (
      SELECT CASE
        WHEN COUNT(*) > 0 THEN
          ROUND((COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*)::numeric) * 100, 2)
        ELSE 0
      END
      FROM saved_quotes
      WHERE created_at BETWEEN p_start_date AND p_end_date
        AND (NOT p_exclude_internal OR is_excluded = false)
    ),
    'excluded_quotes', (
      SELECT COUNT(*) FROM saved_quotes
      WHERE created_at BETWEEN p_start_date AND p_end_date AND is_excluded = true
    ),
    'excluded_events', (
      SELECT COUNT(*) FROM user_events
      WHERE created_at BETWEEN p_start_date AND p_end_date AND is_excluded = true
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Updated get_event_timeline with exclusion support
DROP FUNCTION IF EXISTS get_event_timeline(text, timestamptz, timestamptz, text);

CREATE OR REPLACE FUNCTION get_event_timeline(
  p_event_type text DEFAULT NULL,
  p_start_date timestamptz DEFAULT (now() - interval '30 days'),
  p_end_date timestamptz DEFAULT now(),
  p_interval text DEFAULT 'day',
  p_exclude_internal boolean DEFAULT false
)
RETURNS TABLE (
  period timestamptz,
  event_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    date_trunc(p_interval, created_at) as period,
    COUNT(*) as event_count
  FROM user_events
  WHERE
    created_at BETWEEN p_start_date AND p_end_date
    AND (p_event_type IS NULL OR event_type = p_event_type)
    AND (NOT p_exclude_internal OR is_excluded = false)
  GROUP BY date_trunc(p_interval, created_at)
  ORDER BY period ASC;
END;
$$;

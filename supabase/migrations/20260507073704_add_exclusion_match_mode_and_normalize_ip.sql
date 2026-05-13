/*
  # Extend exclusion matching and normalize customer_ip

  1. Changes
    - Add `match_mode` column to `excluded_ips` (exact | prefix | cidr)
    - Backfill comma-joined `customer_ip` values in `user_events` and `saved_quotes` to their first (real client) IP; keep original in `customer_ip_raw`
    - Rewrite `check_exclusion_on_event`, `check_exclusion_on_quote`, and `refresh_exclusion_flags` to evaluate match_mode
    - Insert Dev-India secondary IP `103.183.91.115` into excluded_ips
    - After rewrite, run refresh to retroactively flag historical rows

  2. Security
    - Triggers remain SECURITY DEFINER with pinned search_path
    - RLS on excluded_ips unchanged

  3. Notes
    - prefix match checks if cleaned IP starts with ip_address
    - cidr match uses inet <<= inet when ip_address contains a '/'
*/

-- 1. Add match_mode column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'excluded_ips' AND column_name = 'match_mode'
  ) THEN
    ALTER TABLE excluded_ips
      ADD COLUMN match_mode text NOT NULL DEFAULT 'exact'
      CHECK (match_mode IN ('exact', 'prefix', 'cidr'));
  END IF;
END $$;

-- 2. Add customer_ip_raw column to preserve originals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_events' AND column_name = 'customer_ip_raw'
  ) THEN
    ALTER TABLE user_events ADD COLUMN customer_ip_raw text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'customer_ip_raw'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN customer_ip_raw text;
  END IF;
END $$;

-- 3. Backfill raw + normalize customer_ip
UPDATE user_events
SET customer_ip_raw = customer_ip,
    customer_ip = trim(split_part(customer_ip, ',', 1))
WHERE customer_ip IS NOT NULL
  AND customer_ip LIKE '%,%'
  AND (customer_ip_raw IS NULL OR customer_ip_raw = '');

UPDATE saved_quotes
SET customer_ip_raw = customer_ip,
    customer_ip = trim(split_part(customer_ip, ',', 1))
WHERE customer_ip IS NOT NULL
  AND customer_ip LIKE '%,%'
  AND (customer_ip_raw IS NULL OR customer_ip_raw = '');

-- 4. Insert Dev-India secondary IP if missing
INSERT INTO excluded_ips (ip_address, label, match_mode)
VALUES ('103.183.91.115', 'Dev - India (secondary)', 'exact')
ON CONFLICT (ip_address) DO NOTHING;

-- 5. Helper: match a clean IP against the excluded_ips table using match_mode
CREATE OR REPLACE FUNCTION is_ip_excluded(p_ip text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF p_ip IS NULL OR p_ip = '' OR p_ip = 'unknown' THEN
    RETURN false;
  END IF;

  FOR r IN SELECT ip_address, match_mode FROM excluded_ips LOOP
    IF r.match_mode = 'exact' AND r.ip_address = p_ip THEN
      RETURN true;
    ELSIF r.match_mode = 'prefix' AND p_ip LIKE r.ip_address || '%' THEN
      RETURN true;
    ELSIF r.match_mode = 'cidr' THEN
      BEGIN
        IF p_ip::inet <<= r.ip_address::inet THEN
          RETURN true;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- ignore malformed cidr entries
        NULL;
      END;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

-- 6. Updated triggers using helper
CREATE OR REPLACE FUNCTION check_exclusion_on_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_ip text;
BEGIN
  clean_ip := trim(split_part(COALESCE(NEW.customer_ip, ''), ',', 1));

  IF is_ip_excluded(clean_ip) THEN
    NEW.is_excluded := true;
    RETURN NEW;
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

CREATE OR REPLACE FUNCTION check_exclusion_on_quote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_ip text;
BEGIN
  clean_ip := trim(split_part(COALESCE(NEW.customer_ip, ''), ',', 1));

  IF is_ip_excluded(clean_ip) THEN
    NEW.is_excluded := true;
    RETURN NEW;
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

-- 7. Updated refresh using helper
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
  UPDATE user_events SET is_excluded = false WHERE is_excluded = true;
  UPDATE saved_quotes SET is_excluded = false WHERE is_excluded = true;

  UPDATE user_events
  SET is_excluded = true
  WHERE is_ip_excluded(trim(split_part(COALESCE(customer_ip, ''), ',', 1)));
  GET DIAGNOSTICS events_updated = ROW_COUNT;

  UPDATE saved_quotes
  SET is_excluded = true
  WHERE is_ip_excluded(trim(split_part(COALESCE(customer_ip, ''), ',', 1)));
  GET DIAGNOSTICS quotes_updated = ROW_COUNT;

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
    'events_flagged', events_updated,
    'quotes_flagged', quotes_updated
  );
END;
$$;

/*
  # Add CIDR / IP range support to excluded_ips

  1. Changes
    - Drop the existing match_mode CHECK and re-add to allow 'range'
    - Add range_start (inet) and range_end (inet) columns
    - Add normalize_excluded_ip_input() helper that parses single IP, CIDR,
      prefix, or "start-end" range strings into the right (match_mode, range_start, range_end)
    - Add a BEFORE INSERT/UPDATE trigger on excluded_ips that auto-fills these
      columns when only ip_address is supplied
    - Extend is_ip_excluded() to evaluate the new 'range' mode
    - Run refresh_exclusion_flags() so historical data picks up any new ranges

  2. Security
    - Trigger and helpers are SECURITY DEFINER with pinned search_path
    - RLS unchanged

  3. Notes
    - Accepts: '1.2.3.4', '1.2.3.4/24', '1.2.3.4-1.2.3.20', '1.2.3.' (prefix)
    - Existing rows are untouched; their match_mode remains valid
*/

-- 1. Replace the match_mode CHECK to allow 'range'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'excluded_ips' AND column_name = 'match_mode'
  ) THEN
    BEGIN
      ALTER TABLE excluded_ips DROP CONSTRAINT IF EXISTS excluded_ips_match_mode_check;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

ALTER TABLE excluded_ips
  ADD CONSTRAINT excluded_ips_match_mode_check
  CHECK (match_mode IN ('exact', 'prefix', 'cidr', 'range'));

-- 2. Add range bound columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'excluded_ips' AND column_name = 'range_start'
  ) THEN
    ALTER TABLE excluded_ips ADD COLUMN range_start inet;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'excluded_ips' AND column_name = 'range_end'
  ) THEN
    ALTER TABLE excluded_ips ADD COLUMN range_end inet;
  END IF;
END $$;

ALTER TABLE excluded_ips DROP CONSTRAINT IF EXISTS excluded_ips_range_bounds_chk;
ALTER TABLE excluded_ips
  ADD CONSTRAINT excluded_ips_range_bounds_chk
  CHECK (
    match_mode <> 'range'
    OR (range_start IS NOT NULL AND range_end IS NOT NULL AND range_start <= range_end)
  );

CREATE INDEX IF NOT EXISTS idx_excluded_ips_range_start ON excluded_ips (range_start);
CREATE INDEX IF NOT EXISTS idx_excluded_ips_range_end ON excluded_ips (range_end);

-- 3. Helper: parse an arbitrary IP rule string into normalized fields
CREATE OR REPLACE FUNCTION normalize_excluded_ip_input(p_input text)
RETURNS TABLE (out_match_mode text, out_range_start inet, out_range_end inet)
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s text;
  parts text[];
  start_inet inet;
  end_inet inet;
BEGIN
  s := trim(coalesce(p_input, ''));
  IF s = '' THEN
    RETURN;
  END IF;

  -- Range form "a-b" or "a - b" (only when no slash present)
  IF position('-' IN s) > 0 AND position('/' IN s) = 0 THEN
    parts := regexp_split_to_array(s, '\s*-\s*');
    IF array_length(parts, 1) = 2 THEN
      BEGIN
        start_inet := parts[1]::inet;
        end_inet := parts[2]::inet;
        IF start_inet > end_inet THEN
          RAISE EXCEPTION 'range_start must be <= range_end';
        END IF;
        out_match_mode := 'range';
        out_range_start := start_inet;
        out_range_end := end_inet;
        RETURN NEXT;
        RETURN;
      EXCEPTION WHEN OTHERS THEN
        -- fall through to other modes
        NULL;
      END;
    END IF;
  END IF;

  -- CIDR form "a.b.c.d/n"
  IF position('/' IN s) > 0 THEN
    BEGIN
      PERFORM s::inet;
      out_match_mode := 'cidr';
      out_range_start := NULL;
      out_range_end := NULL;
      RETURN NEXT;
      RETURN;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- Prefix form ending with a dot
  IF right(s, 1) = '.' THEN
    out_match_mode := 'prefix';
    out_range_start := NULL;
    out_range_end := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Default: exact
  out_match_mode := 'exact';
  out_range_start := NULL;
  out_range_end := NULL;
  RETURN NEXT;
END;
$$;

-- 4. Trigger to auto-fill match_mode + range bounds based on ip_address text
CREATE OR REPLACE FUNCTION normalize_excluded_ips_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  norm record;
BEGIN
  -- Only auto-normalize when caller didn't explicitly set match_mode (or set 'exact' default).
  -- If caller explicitly populated range_start/range_end with match_mode='range', respect it.
  IF NEW.match_mode = 'range' AND NEW.range_start IS NOT NULL AND NEW.range_end IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO norm FROM normalize_excluded_ip_input(NEW.ip_address);
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  NEW.match_mode := norm.out_match_mode;
  NEW.range_start := norm.out_range_start;
  NEW.range_end := norm.out_range_end;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_excluded_ips ON excluded_ips;
CREATE TRIGGER trg_normalize_excluded_ips
  BEFORE INSERT OR UPDATE OF ip_address ON excluded_ips
  FOR EACH ROW
  EXECUTE FUNCTION normalize_excluded_ips_row();

-- 5. Extend is_ip_excluded() for the 'range' mode
CREATE OR REPLACE FUNCTION is_ip_excluded(p_ip text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  p_inet inet;
BEGIN
  IF p_ip IS NULL OR p_ip = '' OR p_ip = 'unknown' THEN
    RETURN false;
  END IF;

  BEGIN
    p_inet := p_ip::inet;
  EXCEPTION WHEN OTHERS THEN
    p_inet := NULL;
  END;

  FOR r IN SELECT ip_address, match_mode, range_start, range_end FROM excluded_ips LOOP
    IF r.match_mode = 'exact' AND r.ip_address = p_ip THEN
      RETURN true;
    ELSIF r.match_mode = 'prefix' AND p_ip LIKE r.ip_address || '%' THEN
      RETURN true;
    ELSIF r.match_mode = 'cidr' AND p_inet IS NOT NULL THEN
      BEGIN
        IF p_inet <<= r.ip_address::inet THEN
          RETURN true;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    ELSIF r.match_mode = 'range' AND p_inet IS NOT NULL
          AND r.range_start IS NOT NULL AND r.range_end IS NOT NULL THEN
      IF p_inet >= r.range_start AND p_inet <= r.range_end THEN
        RETURN true;
      END IF;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

-- 6. Re-flag historical rows so any newly-defined ranges take effect immediately
SELECT refresh_exclusion_flags();

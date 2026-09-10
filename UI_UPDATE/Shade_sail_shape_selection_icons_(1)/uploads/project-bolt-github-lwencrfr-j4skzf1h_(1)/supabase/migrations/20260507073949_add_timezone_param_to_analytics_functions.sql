/*
  # Add timezone parameter to analytics RPCs

  1. Changes
    - Overload `get_event_timeline` with a `p_timezone` argument (default 'UTC') so the chart buckets events in the admin's local day, matching the list views
    - `get_analytics_summary` already operates on timestamp ranges, so no math changes, but we keep its signature stable
    - Drop obsolete 5-arg signature and replace with a 6-arg version accepting timezone

  2. Notes
    - date_trunc() is applied on (created_at AT TIME ZONE p_timezone), then converted back to a timestamptz that displays correctly in clients
*/

DROP FUNCTION IF EXISTS get_event_timeline(text, timestamptz, timestamptz, text, boolean);
DROP FUNCTION IF EXISTS get_event_timeline(text, timestamptz, timestamptz, text);

CREATE OR REPLACE FUNCTION get_event_timeline(
  p_event_type text DEFAULT NULL,
  p_start_date timestamptz DEFAULT (now() - interval '30 days'),
  p_end_date timestamptz DEFAULT now(),
  p_interval text DEFAULT 'day',
  p_exclude_internal boolean DEFAULT false,
  p_timezone text DEFAULT 'UTC'
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
    (date_trunc(p_interval, created_at AT TIME ZONE p_timezone) AT TIME ZONE p_timezone) as period,
    COUNT(*) as event_count
  FROM user_events
  WHERE
    created_at BETWEEN p_start_date AND p_end_date
    AND (p_event_type IS NULL OR event_type = p_event_type)
    AND (NOT p_exclude_internal OR is_excluded = false)
  GROUP BY 1
  ORDER BY 1 ASC;
END;
$$;

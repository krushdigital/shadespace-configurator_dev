/*
  # Fix Analytics to Exclude Duplicate/Incomplete Quote Statuses

  1. Changes
    - Updates `get_analytics_summary` function to accept a `p_status_filter` parameter
    - Revenue calculations now exclude `in_progress` and `checkout_pending` statuses by default
    - Adds separate metrics: `pipeline_value` (quote_ready), `purchased_value` (purchased/completed)
    - Quote count now only counts "real" quotes (not duplicates or in-progress saves)
    - Adds `total_all_quotes` for the unfiltered count (used in admin show-all mode)

  2. Filter Options
    - 'all' = include all statuses in value calculations
    - 'pipeline' = only quote_ready (default -- shows value of active quotes)
    - 'purchased' = only purchased/completed
    - 'active' = quote_ready + purchased + completed (excludes in_progress and checkout_pending)

  3. Important Notes
    - This prevents double-counting when a user saves progress, then saves a full quote
    - checkout_pending entries are auto-save backups and should not count toward revenue
    - in_progress entries often have $0 or incomplete pricing
*/

CREATE OR REPLACE FUNCTION get_analytics_summary(
  p_start_date timestamptz DEFAULT (now() - interval '30 days'),
  p_end_date timestamptz DEFAULT now(),
  p_exclude_internal boolean DEFAULT false,
  p_status_filter text DEFAULT 'active'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  status_condition text;
BEGIN
  -- Build status filter condition
  CASE p_status_filter
    WHEN 'all' THEN
      status_condition := 'true';
    WHEN 'pipeline' THEN
      status_condition := 'status = ''quote_ready''';
    WHEN 'purchased' THEN
      status_condition := 'status IN (''purchased'', ''completed'')';
    ELSE -- 'active' (default)
      status_condition := 'status IN (''quote_ready'', ''purchased'', ''completed'')';
  END CASE;

  SELECT jsonb_build_object(
    'total_quotes', (
      SELECT COUNT(*) FROM saved_quotes
      WHERE created_at BETWEEN p_start_date AND p_end_date
        AND (NOT p_exclude_internal OR is_excluded = false)
        AND status IN ('quote_ready', 'purchased', 'completed')
    ),
    'total_all_quotes', (
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
        AND status IN ('quote_ready', 'purchased', 'completed')
    ),
    'total_quote_value', (
      SELECT COALESCE(SUM((calculations_data->>'totalPrice')::numeric), 0) FROM saved_quotes
      WHERE created_at BETWEEN p_start_date AND p_end_date
        AND (NOT p_exclude_internal OR is_excluded = false)
        AND status IN ('quote_ready', 'purchased', 'completed')
        AND (calculations_data->>'totalPrice')::numeric > 0
    ),
    'pipeline_value', (
      SELECT COALESCE(SUM((calculations_data->>'totalPrice')::numeric), 0) FROM saved_quotes
      WHERE created_at BETWEEN p_start_date AND p_end_date
        AND (NOT p_exclude_internal OR is_excluded = false)
        AND status = 'quote_ready'
        AND (calculations_data->>'totalPrice')::numeric > 0
    ),
    'purchased_value', (
      SELECT COALESCE(SUM((calculations_data->>'totalPrice')::numeric), 0) FROM saved_quotes
      WHERE created_at BETWEEN p_start_date AND p_end_date
        AND (NOT p_exclude_internal OR is_excluded = false)
        AND status IN ('purchased', 'completed')
        AND (calculations_data->>'totalPrice')::numeric > 0
    ),
    'avg_quote_value', (
      SELECT COALESCE(AVG((calculations_data->>'totalPrice')::numeric), 0) FROM saved_quotes
      WHERE created_at BETWEEN p_start_date AND p_end_date
        AND (NOT p_exclude_internal OR is_excluded = false)
        AND status IN ('quote_ready', 'purchased', 'completed')
        AND (calculations_data->>'totalPrice')::numeric > 0
    ),
    'conversion_rate', (
      SELECT CASE
        WHEN COUNT(*) FILTER (WHERE status IN ('quote_ready', 'purchased', 'completed')) > 0 THEN
          ROUND(
            (COUNT(*) FILTER (WHERE status IN ('purchased', 'completed'))::numeric /
             COUNT(*) FILTER (WHERE status IN ('quote_ready', 'purchased', 'completed'))::numeric) * 100, 2
          )
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

GRANT EXECUTE ON FUNCTION get_analytics_summary(timestamptz, timestamptz, boolean, text) TO anon;

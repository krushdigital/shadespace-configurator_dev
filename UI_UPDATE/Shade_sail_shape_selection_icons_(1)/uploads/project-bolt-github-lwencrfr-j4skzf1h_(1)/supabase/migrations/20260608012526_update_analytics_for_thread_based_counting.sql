/*
# Update Analytics to Use Thread-Based Counting

## Purpose
Replaces individual quote counting with thread-based counting in analytics.
This ensures that multiple quotes from the same customer's purchasing decision
are only counted once in pipeline/conversion metrics.

## Changes
- Replaces get_analytics_summary function to count by quote_threads
- total_quotes = count of threads with active statuses (not individual rows)
- pipeline_value = sum from threads where status = 'quote_ready'
- purchased_value = sum from threads where status in ('purchased', 'completed')
- conversion_rate = purchased threads / total active threads
- Adds avg_quotes_per_thread metric
- Keeps total_all_quotes as raw individual row count for reference

## Notes
- Falls back gracefully if quote_threads is empty (counts individual quotes)
- Excluded IP filtering still works via the saved_quotes.is_excluded flag on primary quotes
*/

CREATE OR REPLACE FUNCTION get_analytics_summary(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_exclude_internal boolean DEFAULT false,
  p_status_filter text DEFAULT 'active',
  p_timezone text DEFAULT 'UTC'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_total_threads bigint := 0;
  v_total_all_quotes bigint := 0;
  v_unique_customers bigint := 0;
  v_pipeline_value numeric := 0;
  v_purchased_value numeric := 0;
  v_total_quote_value numeric := 0;
  v_avg_quote_value numeric := 0;
  v_conversion_rate numeric := 0;
  v_pdf_downloads bigint := 0;
  v_email_summaries bigint := 0;
  v_add_to_cart bigint := 0;
  v_excluded_quotes bigint := 0;
  v_excluded_events bigint := 0;
  v_avg_quotes_per_thread numeric := 0;
  v_has_threads boolean := false;
BEGIN
  -- Check if we have thread data
  SELECT EXISTS (SELECT 1 FROM quote_threads LIMIT 1) INTO v_has_threads;

  IF v_has_threads THEN
    -- Thread-based counting (preferred)

    -- Count threads with active statuses in date range
    SELECT count(*)
    INTO v_total_threads
    FROM quote_threads qt
    WHERE qt.status IN ('quote_ready', 'purchased', 'completed')
      AND qt.created_at >= p_start_date
      AND qt.created_at <= p_end_date
      AND (NOT p_exclude_internal OR NOT EXISTS (
        SELECT 1 FROM saved_quotes sq
        WHERE sq.id = qt.primary_quote_id AND sq.is_excluded = true
      ));

    -- Pipeline value (quote_ready threads)
    SELECT COALESCE(SUM(qt.latest_value), 0)
    INTO v_pipeline_value
    FROM quote_threads qt
    WHERE qt.status = 'quote_ready'
      AND qt.created_at >= p_start_date
      AND qt.created_at <= p_end_date
      AND (NOT p_exclude_internal OR NOT EXISTS (
        SELECT 1 FROM saved_quotes sq
        WHERE sq.id = qt.primary_quote_id AND sq.is_excluded = true
      ));

    -- Purchased value
    SELECT COALESCE(SUM(qt.latest_value), 0)
    INTO v_purchased_value
    FROM quote_threads qt
    WHERE qt.status IN ('purchased', 'completed')
      AND qt.created_at >= p_start_date
      AND qt.created_at <= p_end_date
      AND (NOT p_exclude_internal OR NOT EXISTS (
        SELECT 1 FROM saved_quotes sq
        WHERE sq.id = qt.primary_quote_id AND sq.is_excluded = true
      ));

    -- Total quote value
    v_total_quote_value := v_pipeline_value + v_purchased_value;

    -- Average quote value per thread
    IF v_total_threads > 0 THEN
      v_avg_quote_value := v_total_quote_value / v_total_threads;
    END IF;

    -- Conversion rate
    DECLARE
      v_purchased_threads bigint := 0;
    BEGIN
      SELECT count(*)
      INTO v_purchased_threads
      FROM quote_threads qt
      WHERE qt.status IN ('purchased', 'completed')
        AND qt.created_at >= p_start_date
        AND qt.created_at <= p_end_date
        AND (NOT p_exclude_internal OR NOT EXISTS (
          SELECT 1 FROM saved_quotes sq
          WHERE sq.id = qt.primary_quote_id AND sq.is_excluded = true
        ));

      IF v_total_threads > 0 THEN
        v_conversion_rate := (v_purchased_threads::numeric / v_total_threads::numeric) * 100;
      END IF;
    END;

    -- Unique customers (by email across threads)
    SELECT count(DISTINCT qt.customer_email)
    INTO v_unique_customers
    FROM quote_threads qt
    WHERE qt.status IN ('quote_ready', 'purchased', 'completed')
      AND qt.created_at >= p_start_date
      AND qt.created_at <= p_end_date
      AND qt.customer_email != ''
      AND (NOT p_exclude_internal OR NOT EXISTS (
        SELECT 1 FROM saved_quotes sq
        WHERE sq.id = qt.primary_quote_id AND sq.is_excluded = true
      ));

    -- Average quotes per thread
    SELECT COALESCE(AVG(qt.quote_count), 1)
    INTO v_avg_quotes_per_thread
    FROM quote_threads qt
    WHERE qt.created_at >= p_start_date
      AND qt.created_at <= p_end_date;

  ELSE
    -- Fallback: individual quote counting (no threads yet)
    SELECT count(*), COALESCE(SUM(
      COALESCE(sq.locked_total, (sq.calculations_data->>'totalPrice')::numeric)
    ), 0)
    INTO v_total_threads, v_total_quote_value
    FROM saved_quotes sq
    WHERE sq.status IN ('quote_ready', 'purchased', 'completed')
      AND sq.created_at >= p_start_date
      AND sq.created_at <= p_end_date
      AND (NOT p_exclude_internal OR sq.is_excluded = false);

    SELECT COALESCE(SUM(
      COALESCE(sq.locked_total, (sq.calculations_data->>'totalPrice')::numeric)
    ), 0)
    INTO v_pipeline_value
    FROM saved_quotes sq
    WHERE sq.status = 'quote_ready'
      AND sq.created_at >= p_start_date
      AND sq.created_at <= p_end_date
      AND (NOT p_exclude_internal OR sq.is_excluded = false);

    SELECT COALESCE(SUM(
      COALESCE(sq.locked_total, (sq.calculations_data->>'totalPrice')::numeric)
    ), 0)
    INTO v_purchased_value
    FROM saved_quotes sq
    WHERE sq.status IN ('purchased', 'completed')
      AND sq.created_at >= p_start_date
      AND sq.created_at <= p_end_date
      AND (NOT p_exclude_internal OR sq.is_excluded = false);

    IF v_total_threads > 0 THEN
      v_avg_quote_value := v_total_quote_value / v_total_threads;
    END IF;

    SELECT count(DISTINCT sq.customer_email)
    INTO v_unique_customers
    FROM saved_quotes sq
    WHERE sq.status IN ('quote_ready', 'purchased', 'completed')
      AND sq.created_at >= p_start_date
      AND sq.created_at <= p_end_date
      AND sq.customer_email IS NOT NULL
      AND (NOT p_exclude_internal OR sq.is_excluded = false);

    DECLARE
      v_purchased_count bigint := 0;
    BEGIN
      SELECT count(*)
      INTO v_purchased_count
      FROM saved_quotes sq
      WHERE sq.status IN ('purchased', 'completed')
        AND sq.created_at >= p_start_date
        AND sq.created_at <= p_end_date
        AND (NOT p_exclude_internal OR sq.is_excluded = false);

      IF v_total_threads > 0 THEN
        v_conversion_rate := (v_purchased_count::numeric / v_total_threads::numeric) * 100;
      END IF;
    END;

    v_avg_quotes_per_thread := 1;
  END IF;

  -- Total raw quotes (always individual count for reference)
  SELECT count(*)
  INTO v_total_all_quotes
  FROM saved_quotes sq
  WHERE sq.created_at >= p_start_date
    AND sq.created_at <= p_end_date
    AND (NOT p_exclude_internal OR sq.is_excluded = false);

  -- Event counts (independent of threading)
  SELECT count(*)
  INTO v_pdf_downloads
  FROM user_events ue
  WHERE ue.event_type = 'pdf_download'
    AND ue.created_at >= p_start_date
    AND ue.created_at <= p_end_date
    AND (NOT p_exclude_internal OR NOT EXISTS (
      SELECT 1 FROM excluded_ips ei WHERE ei.ip_address = ue.customer_ip
    ));

  SELECT count(*)
  INTO v_email_summaries
  FROM user_events ue
  WHERE ue.event_type = 'email_summary'
    AND ue.created_at >= p_start_date
    AND ue.created_at <= p_end_date
    AND (NOT p_exclude_internal OR NOT EXISTS (
      SELECT 1 FROM excluded_ips ei WHERE ei.ip_address = ue.customer_ip
    ));

  SELECT count(*)
  INTO v_add_to_cart
  FROM user_events ue
  WHERE ue.event_type = 'add_to_cart'
    AND ue.success = true
    AND ue.created_at >= p_start_date
    AND ue.created_at <= p_end_date
    AND (NOT p_exclude_internal OR NOT EXISTS (
      SELECT 1 FROM excluded_ips ei WHERE ei.ip_address = ue.customer_ip
    ));

  -- Excluded counts
  IF p_exclude_internal THEN
    SELECT count(*)
    INTO v_excluded_quotes
    FROM saved_quotes sq
    WHERE sq.is_excluded = true
      AND sq.created_at >= p_start_date
      AND sq.created_at <= p_end_date;

    SELECT count(*)
    INTO v_excluded_events
    FROM user_events ue
    WHERE ue.created_at >= p_start_date
      AND ue.created_at <= p_end_date
      AND EXISTS (
        SELECT 1 FROM excluded_ips ei WHERE ei.ip_address = ue.customer_ip
      );
  END IF;

  result := jsonb_build_object(
    'total_quotes', v_total_threads,
    'total_all_quotes', v_total_all_quotes,
    'unique_customers', v_unique_customers,
    'pipeline_value', v_pipeline_value,
    'purchased_value', v_purchased_value,
    'total_quote_value', v_total_quote_value,
    'avg_quote_value', ROUND(v_avg_quote_value, 2),
    'conversion_rate', ROUND(v_conversion_rate, 1),
    'pdf_downloads', v_pdf_downloads,
    'email_summaries', v_email_summaries,
    'add_to_cart', v_add_to_cart,
    'excluded_quotes', v_excluded_quotes,
    'excluded_events', v_excluded_events,
    'avg_quotes_per_thread', ROUND(v_avg_quotes_per_thread, 1)
  );

  RETURN result;
END;
$$;

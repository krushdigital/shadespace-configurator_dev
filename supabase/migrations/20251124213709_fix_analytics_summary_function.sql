/*
  # Fix Analytics Summary Function
  
  The analytics summary function was using a LEFT JOIN which caused it to only count
  events that had a quote_id and where the quote was created in the date range.
  
  This fix:
  - Removes the JOIN dependency
  - Counts events independently based on their own created_at timestamp
  - Properly filters events by their event_type and date range
  
  This ensures PDF downloads and email summaries are counted correctly even when
  they don't have an associated quote_id.
*/

DROP FUNCTION IF EXISTS get_analytics_summary(timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION get_analytics_summary(
  p_start_date timestamptz DEFAULT (now() - interval '30 days'),
  p_end_date timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
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
$$;
/*
  # Force Analytics Function Refresh
  
  Drop and recreate the function to force PostgREST to reload the schema cache.
*/

-- Drop the function completely
DROP FUNCTION IF EXISTS public.get_analytics_summary(timestamp with time zone, timestamp with time zone);

-- Notify PostgREST to reload
NOTIFY pgrst, 'reload schema';

-- Recreate with exact same signature
CREATE FUNCTION public.get_analytics_summary(
  p_start_date timestamptz DEFAULT (now() - interval '30 days'),
  p_end_date timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
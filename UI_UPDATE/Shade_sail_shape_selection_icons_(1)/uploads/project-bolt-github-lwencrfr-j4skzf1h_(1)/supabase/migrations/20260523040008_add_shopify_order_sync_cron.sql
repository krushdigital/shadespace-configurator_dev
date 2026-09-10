/*
  # Add Shopify Order Sync Cron Job

  1. Changes
    - Adds a pg_cron schedule to call sync-shopify-orders every 30 minutes
    - Uses the existing call_email_edge_function pattern

  2. Notes
    - Runs every 30 minutes as a safety net alongside the real-time webhook
    - Logs runs to cron_run_log table
*/

-- Add cancelled status to email_queue if not exists
DO $$
BEGIN
  -- Ensure status column accepts 'cancelled' value
  -- The column is text type so no enum changes needed
  NULL;
END $$;

-- Schedule the sync job every 30 minutes
SELECT cron.schedule(
  'sync-shopify-orders',
  '*/30 * * * *',
  $$SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/sync-shopify-orders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := '{}'::jsonb
  );$$
);

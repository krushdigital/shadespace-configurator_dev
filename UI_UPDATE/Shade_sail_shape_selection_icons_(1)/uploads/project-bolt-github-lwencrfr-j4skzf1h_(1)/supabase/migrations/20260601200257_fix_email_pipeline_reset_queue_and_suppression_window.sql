/*
  # Fix Email Pipeline: Reset Queue, Add Suppression Window, Fix Cron Timeout

  1. Queue Reset
    - Sets all stuck "sending" and "pending" items to "skipped" (no emails were actually delivered)
    - Clears the queue so the evaluator can re-evaluate from scratch

  2. Modified Tables
    - `email_automations`
      - Added `suppression_window_hours` (integer, default 24) - when a customer purchases
        one quote, suppress all other quotes from the same email created within this time window
    - `email_pipeline_config`
      - Added `suppression_window_hours_default` (integer, default 24) - global default,
        super admin configurable

  3. New Function
    - `cancel_queue_for_automation(automation_uuid)` - skips all pending/sending items
      for a specific automation (called when pausing)

  4. Trigger
    - `trg_automation_pause_cancel_queue` - when is_active changes to false, automatically
      skips pending/sending queue items for that automation

  5. Cron Fix
    - Replaces `call_email_edge_function` with a 30-second timeout parameter
    - Fixes `sync-shopify-orders` cron to use `email_pipeline_config` instead of NULL app settings

  6. Notes
    - suppression_window_hours on the automation overrides the global default when set
    - The trigger fires AFTER update so queue items are immediately cancelled on pause
*/

-- 1. Skip all stuck items (none were actually delivered - 0 have resend_message_id)
UPDATE email_queue
SET status = 'skipped'
WHERE status IN ('sending', 'pending');

-- 2. Add suppression_window_hours to email_automations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_automations' AND column_name = 'suppression_window_hours'
  ) THEN
    ALTER TABLE email_automations ADD COLUMN suppression_window_hours integer DEFAULT 24;
  END IF;
END $$;

-- 3. Add global default to email_pipeline_config
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_pipeline_config' AND column_name = 'suppression_window_hours_default'
  ) THEN
    ALTER TABLE email_pipeline_config ADD COLUMN suppression_window_hours_default integer NOT NULL DEFAULT 24;
  END IF;
END $$;

-- 4. Create cancel function
CREATE OR REPLACE FUNCTION cancel_queue_for_automation(p_automation_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  skipped_count integer;
BEGIN
  UPDATE email_queue
  SET status = 'skipped'
  WHERE automation_id = p_automation_id
    AND status IN ('pending', 'sending');
  GET DIAGNOSTICS skipped_count = ROW_COUNT;
  RETURN skipped_count;
END $$;

-- 5. Create trigger to auto-cancel queue on pause
CREATE OR REPLACE FUNCTION trg_fn_automation_pause_cancel_queue()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.is_active = true AND NEW.is_active = false THEN
    PERFORM cancel_queue_for_automation(NEW.id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_automation_pause_cancel_queue ON email_automations;
CREATE TRIGGER trg_automation_pause_cancel_queue
  AFTER UPDATE OF is_active ON email_automations
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_automation_pause_cancel_queue();

-- 6. Fix call_email_edge_function with 30s timeout
CREATE OR REPLACE FUNCTION call_email_edge_function(fn text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  cfg record;
  req_id bigint;
BEGIN
  SELECT * INTO cfg FROM email_pipeline_config WHERE id = 1;
  IF cfg.service_role_key IS NULL THEN
    INSERT INTO cron_run_log (job, status, response)
    VALUES (fn, 'skipped_no_key', jsonb_build_object('reason', 'service_role_key not set in email_pipeline_config'));
    RETURN;
  END IF;

  SELECT net.http_post(
    url := cfg.supabase_url || '/functions/v1/' || fn,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || cfg.service_role_key
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) INTO req_id;

  INSERT INTO cron_run_log (job, status, response) VALUES (fn, 'dispatched', jsonb_build_object('request_id', req_id));
END $$;

-- 7. Fix shopify order sync cron to use email_pipeline_config
DO $$ BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'sync-shopify-orders';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'sync-shopify-orders',
  '*/30 * * * *',
  $$SELECT call_email_edge_function('sync-shopify-orders')$$
);

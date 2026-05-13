/*
  # Email pipeline cron jobs
  Schedules the evaluator + queue processor to run every 5 minutes via pg_cron + pg_net.
  Also creates a cron_run_log table so the Email Studio can show pipeline health.
*/

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS cron_run_log (
  id bigserial PRIMARY KEY,
  job text NOT NULL,
  status text NOT NULL,
  http_status int,
  response jsonb,
  ran_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cron_run_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin read cron log" ON cron_run_log;
CREATE POLICY "Super admin read cron log" ON cron_run_log
  FOR SELECT TO authenticated USING (is_super_admin());

CREATE OR REPLACE FUNCTION call_email_edge_function(fn text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  sb_url text;
  sb_key text;
  req_id bigint;
BEGIN
  sb_url := current_setting('app.supabase_url', true);
  sb_key := current_setting('app.service_role_key', true);
  IF sb_url IS NULL OR sb_key IS NULL THEN
    INSERT INTO cron_run_log (job, status, response) VALUES (fn, 'skipped_no_config', jsonb_build_object('reason', 'missing app settings'));
    RETURN;
  END IF;

  SELECT net.http_post(
    url := sb_url || '/functions/v1/' || fn,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || sb_key
    ),
    body := '{}'::jsonb
  ) INTO req_id;

  INSERT INTO cron_run_log (job, status, response) VALUES (fn, 'dispatched', jsonb_build_object('request_id', req_id));
END $$;

-- Unschedule previous instances if present (idempotent)
DO $$ BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('email-evaluator', 'email-queue-processor');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule('email-evaluator', '*/5 * * * *', $$SELECT call_email_edge_function('evaluate-email-automations')$$);
SELECT cron.schedule('email-queue-processor', '*/5 * * * *', $$SELECT call_email_edge_function('process-email-queue')$$);

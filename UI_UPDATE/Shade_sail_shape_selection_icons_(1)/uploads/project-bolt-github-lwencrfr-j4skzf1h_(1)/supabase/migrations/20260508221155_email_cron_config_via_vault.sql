/*
  Update call_email_edge_function to read config from vault.secrets.
  Super admin is expected to run the vault.create_secret calls once the service role
  key is rotated into the vault (set up below using a hardcoded URL and prompting for key).
*/

CREATE TABLE IF NOT EXISTS email_pipeline_config (
  id int PRIMARY KEY DEFAULT 1,
  supabase_url text NOT NULL,
  service_role_key text,
  CHECK (id = 1)
);

ALTER TABLE email_pipeline_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "super admin manage pipeline config" ON email_pipeline_config;
CREATE POLICY "super admin manage pipeline config" ON email_pipeline_config
  FOR SELECT TO authenticated USING (is_super_admin());

INSERT INTO email_pipeline_config (id, supabase_url)
VALUES (1, 'https://ylrijvwogytbclhcwevy.supabase.co')
ON CONFLICT (id) DO UPDATE SET supabase_url = EXCLUDED.supabase_url;

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
    body := '{}'::jsonb
  ) INTO req_id;

  INSERT INTO cron_run_log (job, status, response) VALUES (fn, 'dispatched', jsonb_build_object('request_id', req_id));
END $$;

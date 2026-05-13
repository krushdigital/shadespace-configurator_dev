/*
  # Email Studio: Templates, Automations, Senders, Queue, Events

  1. New Tables
    - email_senders: configurable from-addresses
    - email_templates: rich templates with html/text/design_json
    - email_automations: IFTTT rules with trigger config
    - email_automation_conditions: AND filters per automation
    - email_queue: pending/sent sends
    - email_events: delivery/open/click/bounce events
    - email_unsubscribes: opt-out list

  2. Security
    - RLS enabled on all tables
    - Authenticated admin full access (checked via admin_users)
    - Anon read on email_unsubscribes token lookup disallowed (edge function uses service role)
*/

CREATE TABLE IF NOT EXISTS email_senders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  from_name text NOT NULL,
  from_email text NOT NULL UNIQUE,
  reply_to text,
  signature_name text,
  signature_phone text,
  is_default boolean NOT NULL DEFAULT false,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  subject text NOT NULL DEFAULT '',
  html_body text NOT NULL DEFAULT '',
  text_body text NOT NULL DEFAULT '',
  design_json jsonb NOT NULL DEFAULT '{"blocks":[]}'::jsonb,
  default_sender_id uuid REFERENCES email_senders(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  is_active boolean NOT NULL DEFAULT false,
  trigger_type text NOT NULL CHECK (trigger_type IN (
    'quote_saved','quote_reached_step','quote_idle','pdf_downloaded','cart_not_completed','email_clicked'
  )),
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  delay_minutes integer NOT NULL DEFAULT 0,
  template_id uuid REFERENCES email_templates(id) ON DELETE SET NULL,
  sender_id uuid REFERENCES email_senders(id) ON DELETE SET NULL,
  max_sends_per_quote integer NOT NULL DEFAULT 1,
  respect_exclusions boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_automation_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES email_automations(id) ON DELETE CASCADE,
  field text NOT NULL,
  operator text NOT NULL CHECK (operator IN ('eq','neq','gte','lte','contains','in')),
  value text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid REFERENCES email_automations(id) ON DELETE SET NULL,
  template_id uuid REFERENCES email_templates(id) ON DELETE SET NULL,
  sender_id uuid REFERENCES email_senders(id) ON DELETE SET NULL,
  quote_id uuid REFERENCES saved_quotes(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed','skipped')),
  resend_message_id text,
  subject_snapshot text,
  html_snapshot text,
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status_scheduled ON email_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_quote ON email_queue(quote_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_automation ON email_queue(automation_id);

CREATE TABLE IF NOT EXISTS email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id uuid REFERENCES email_queue(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('sent','delivered','opened','clicked','bounced','complained','unsubscribed')),
  url text,
  user_agent text,
  ip text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_events_queue ON email_events(queue_id);
CREATE INDEX IF NOT EXISTS idx_email_events_type_time ON email_events(event_type, occurred_at);

CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_senders ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_automation_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- Admin-user check helper (re-use existing admin_users table)
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid());
$$;

-- Policies: admin full access
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['email_senders','email_templates','email_automations','email_automation_conditions','email_queue','email_events','email_unsubscribes']) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Admin select %I" ON %I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Admin insert %I" ON %I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Admin update %I" ON %I;', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Admin delete %I" ON %I;', t, t);

    EXECUTE format('CREATE POLICY "Admin select %I" ON %I FOR SELECT TO authenticated USING (is_admin_user());', t, t);
    EXECUTE format('CREATE POLICY "Admin insert %I" ON %I FOR INSERT TO authenticated WITH CHECK (is_admin_user());', t, t);
    EXECUTE format('CREATE POLICY "Admin update %I" ON %I FOR UPDATE TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());', t, t);
    EXECUTE format('CREATE POLICY "Admin delete %I" ON %I FOR DELETE TO authenticated USING (is_admin_user());', t, t);
  END LOOP;
END $$;

-- updated_at triggers
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['email_senders','email_templates','email_automations']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at ON %I;', t);
    EXECUTE format('CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at();', t);
  END LOOP;
END $$;

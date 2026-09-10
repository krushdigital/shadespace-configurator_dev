/*
  # Currency switch redirect failure telemetry

  Tracks cases where the configurator attempted to redirect a visitor to a different storefront
  domain to align currency but the redirect did not complete (e.g. destination domain unreachable,
  blocked by the browser, or DNS failure). Used to detect and alert on broken cross-domain
  currency alignment.

  1. New Tables
    - `currency_switch_redirect_failures`
      - `id` (uuid, primary key)
      - `quote_id` (uuid, nullable) - the saved quote that triggered the redirect
      - `quote_currency` (text) - the currency the quote is priced in
      - `target_domain` (text) - the storefront domain we tried to redirect to
      - `origin_domain` (text) - the domain we redirected from
      - `user_agent` (text)
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled
    - Anonymous INSERT allowed (client-side telemetry)
    - Authenticated SELECT allowed for admin dashboard access
*/

CREATE TABLE IF NOT EXISTS currency_switch_redirect_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid,
  quote_currency text NOT NULL DEFAULT '',
  target_domain text NOT NULL DEFAULT '',
  origin_domain text NOT NULL DEFAULT '',
  user_agent text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE currency_switch_redirect_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log redirect failures"
  ON currency_switch_redirect_failures FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can read redirect failures"
  ON currency_switch_redirect_failures FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_currency_switch_redirect_failures_created
  ON currency_switch_redirect_failures (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_currency_switch_redirect_failures_quote
  ON currency_switch_redirect_failures (quote_id);

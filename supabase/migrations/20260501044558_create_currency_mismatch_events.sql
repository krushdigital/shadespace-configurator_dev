/*
  # Currency Mismatch Telemetry

  1. New Tables
    - `currency_mismatch_events`
      - `id` (uuid, primary key)
      - `detected_country` (text) - IP-detected country code
      - `detected_currency` (text) - IP-detected currency code
      - `shopify_country` (text) - country Shopify thought visitor was in
      - `shopify_currency` (text) - currency Shopify was showing
      - `action_taken` (text) - `localization_switch`, `no_matching_market`, or `no_change`
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS
    - Allow anon/authenticated INSERT so client can log events; no SELECT policy (read via service role only).
*/

CREATE TABLE IF NOT EXISTS currency_mismatch_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_country text NOT NULL DEFAULT '',
  detected_currency text NOT NULL DEFAULT '',
  shopify_country text NOT NULL DEFAULT '',
  shopify_currency text NOT NULL DEFAULT '',
  action_taken text NOT NULL DEFAULT 'no_change',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE currency_mismatch_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert currency mismatch events"
  ON currency_mismatch_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_currency_mismatch_events_created_at
  ON currency_mismatch_events (created_at);

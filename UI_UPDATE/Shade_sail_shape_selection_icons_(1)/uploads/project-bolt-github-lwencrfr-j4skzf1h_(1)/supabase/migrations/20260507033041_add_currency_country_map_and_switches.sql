/*
  # Currency ↔ Country Map and Switch Telemetry

  1. New Tables
    - `currency_country_map`
      - `currency` (text, primary key) - ISO 4217 currency code
      - `preferred_country_code` (text) - ISO 3166-1 alpha-2 country that should be selected in Shopify to render this currency
      - `preferred_domain` (text) - storefront domain where this currency is native (e.g. shadespace.com.au)
      - `updated_at` (timestamptz)
    - `currency_switches`
      - `id` (uuid, pk)
      - `quote_id` (uuid, nullable)
      - `quote_currency` (text) - currency stored on the quote
      - `storefront_currency_before` (text)
      - `storefront_country_before` (text)
      - `target_country` (text) - country submitted to /localization
      - `domain` (text) - domain where the switch happened
      - `triggered_by` (text) - `quote_load` / `manual` / `cart_guard`
      - `user_agent` (text)
      - `created_at` (timestamptz default now())

  2. Seeded defaults for currency_country_map

  3. Security
    - RLS enabled on both
    - Public SELECT on currency_country_map (reference data)
    - Anon INSERT on currency_switches (client telemetry)
*/

CREATE TABLE IF NOT EXISTS currency_country_map (
  currency text PRIMARY KEY,
  preferred_country_code text NOT NULL DEFAULT '',
  preferred_domain text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE currency_country_map ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'currency_country_map' AND policyname = 'Public can read currency map'
  ) THEN
    CREATE POLICY "Public can read currency map"
      ON currency_country_map
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

INSERT INTO currency_country_map (currency, preferred_country_code, preferred_domain) VALUES
  ('AUD', 'AU', 'shadespace.com.au'),
  ('NZD', 'NZ', 'shadespace.com.au'),
  ('USD', 'US', 'shadespace.com'),
  ('CAD', 'CA', 'shadespace.com'),
  ('GBP', 'GB', 'shadespace.com'),
  ('EUR', 'DE', 'shadespace.com'),
  ('JPY', 'JP', 'shadespace.com'),
  ('SGD', 'SG', 'shadespace.com')
ON CONFLICT (currency) DO NOTHING;

CREATE TABLE IF NOT EXISTS currency_switches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid,
  quote_currency text NOT NULL DEFAULT '',
  storefront_currency_before text NOT NULL DEFAULT '',
  storefront_country_before text NOT NULL DEFAULT '',
  target_country text NOT NULL DEFAULT '',
  domain text NOT NULL DEFAULT '',
  triggered_by text NOT NULL DEFAULT 'quote_load',
  user_agent text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE currency_switches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'currency_switches' AND policyname = 'Anyone can insert currency switches'
  ) THEN
    CREATE POLICY "Anyone can insert currency switches"
      ON currency_switches
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_currency_switches_created_at ON currency_switches (created_at);
CREATE INDEX IF NOT EXISTS idx_currency_switches_quote_id ON currency_switches (quote_id);

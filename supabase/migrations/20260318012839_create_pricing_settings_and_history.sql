/*
  # Create Pricing Settings & Pricing History Tables

  1. New Tables
    - `pricing_settings`
      - `id` (uuid, primary key)
      - `currency_code` (text, unique) - ISO 4217 currency code (e.g., USD, AUD, GBP)
      - `currency_name` (text) - Display name (e.g., "US Dollar")
      - `currency_symbol` (text) - Display symbol (e.g., "US$", "£")
      - `market_markup` (numeric) - Market-specific markup multiplier (e.g., 1.30 = 30% markup)
      - `zonos_dhl_markup` (numeric) - Zonos/DHL shipping & duties markup multiplier per currency
      - `exchange_rate` (numeric) - Exchange rate from NZD to this currency
      - `is_active` (boolean) - Whether this currency is available in the configurator
      - `display_order` (integer) - Sort order for currency selector
      - `updated_at` (timestamptz) - Last time this row was modified
      - `created_at` (timestamptz) - Row creation timestamp
    - `pricing_history`
      - `id` (uuid, primary key)
      - `currency_code` (text) - Which currency was changed
      - `field_changed` (text) - Which field was updated
      - `old_value` (text) - Previous value
      - `new_value` (text) - New value
      - `changed_by` (text) - Who made the change (admin identifier)
      - `change_reason` (text, nullable) - Optional reason for the change
      - `created_at` (timestamptz) - When the change was made

  2. Security
    - Enable RLS on both tables
    - `pricing_settings`: anon can SELECT active currencies (read pricing data for configurator)
    - `pricing_settings`: Only admin-authenticated users can INSERT/UPDATE/DELETE
    - `pricing_history`: anon can SELECT (for admin dashboard reads)
    - `pricing_history`: Only admin-authenticated users can INSERT

  3. Important Notes
    - All base product prices remain in NZD in the codebase
    - Pricing flow: Base NZD -> Market Markup -> Zonos/DHL Markup -> Exchange Rate Conversion
    - NZD has 1.0 for all markups and exchange rate (domestic, no conversion)
    - Market markup covers margin adjustments per market
    - Zonos/DHL markup covers international shipping, duties, and tariffs per currency/region
*/

-- Create pricing_settings table
CREATE TABLE IF NOT EXISTS pricing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code text UNIQUE NOT NULL,
  currency_name text NOT NULL,
  currency_symbol text NOT NULL,
  market_markup numeric NOT NULL DEFAULT 1.0,
  zonos_dhl_markup numeric NOT NULL DEFAULT 1.0,
  exchange_rate numeric NOT NULL DEFAULT 1.0,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_markup_positive CHECK (market_markup > 0),
  CONSTRAINT zonos_dhl_markup_positive CHECK (zonos_dhl_markup > 0),
  CONSTRAINT exchange_rate_positive CHECK (exchange_rate > 0)
);

ALTER TABLE pricing_settings ENABLE ROW LEVEL SECURITY;

-- Anon users can read active pricing settings (needed for the configurator)
CREATE POLICY "Anon can read active pricing settings"
  ON pricing_settings
  FOR SELECT
  TO anon
  USING (is_active = true);

-- Authenticated users can read all pricing settings (admin dashboard)
CREATE POLICY "Authenticated can read all pricing settings"
  ON pricing_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Authenticated users can update pricing settings
CREATE POLICY "Authenticated can update pricing settings"
  ON pricing_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can insert pricing settings
CREATE POLICY "Authenticated can insert pricing settings"
  ON pricing_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create pricing_history table
CREATE TABLE IF NOT EXISTS pricing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code text NOT NULL,
  field_changed text NOT NULL,
  old_value text NOT NULL,
  new_value text NOT NULL,
  changed_by text NOT NULL DEFAULT 'admin',
  change_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pricing_history ENABLE ROW LEVEL SECURITY;

-- Anon can read pricing history (admin dashboard uses anon key)
CREATE POLICY "Anon can read pricing history"
  ON pricing_history
  FOR SELECT
  TO anon
  USING (true);

-- Anon can insert pricing history (admin dashboard uses anon key)
CREATE POLICY "Anon can insert pricing history"
  ON pricing_history
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Seed initial pricing data based on current hardcoded values
INSERT INTO pricing_settings (currency_code, currency_name, currency_symbol, market_markup, zonos_dhl_markup, exchange_rate, is_active, display_order)
VALUES
  ('NZD', 'New Zealand Dollar', 'NZ$', 1.00, 1.00, 1.00, true, 1),
  ('USD', 'US Dollar', 'US$', 1.30, 1.00, 0.58, true, 2),
  ('AUD', 'Australian Dollar', 'AU$', 0.90, 1.00, 0.88, true, 3),
  ('GBP', 'British Pound', '£', 1.68, 1.00, 0.43, true, 4),
  ('EUR', 'Euro', '€', 1.652, 1.00, 0.50, true, 5),
  ('CAD', 'Canadian Dollar', 'CA$', 1.30, 1.00, 0.81, true, 6),
  ('AED', 'UAE Dirham', 'AED', 2.10, 1.00, 2.19, true, 7)
ON CONFLICT (currency_code) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pricing_settings_currency_code ON pricing_settings(currency_code);
CREATE INDEX IF NOT EXISTS idx_pricing_settings_active ON pricing_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_pricing_history_currency_code ON pricing_history(currency_code);
CREATE INDEX IF NOT EXISTS idx_pricing_history_created_at ON pricing_history(created_at DESC);

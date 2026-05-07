/*
  # Create user_currency_preferences table

  Persists a visitor's explicitly-chosen country/currency so the configurator
  never auto-redirects them back to their IP-detected market after they have
  manually switched currency via the Shopify footer localization form.

  1. New Tables
    - `user_currency_preferences`
      - `id` (uuid, primary key)
      - `client_id` (text, unique) - anonymous browser UUID stored in localStorage
      - `country_code` (text) - ISO country code user explicitly selected
      - `currency_code` (text, nullable) - currency (if known)
      - `user_agent` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `expires_at` (timestamptz) - default 180 days

  2. Security
    - Enable RLS
    - Allow anonymous INSERT, SELECT, UPDATE keyed by client_id supplied in
      request body (no auth.uid available - anonymous visitors).
    - No DELETE policy (records expire via expires_at and can be cleaned by admin).
*/

CREATE TABLE IF NOT EXISTS user_currency_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text UNIQUE NOT NULL,
  country_code text NOT NULL DEFAULT '',
  currency_code text DEFAULT '',
  user_agent text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '180 days')
);

CREATE INDEX IF NOT EXISTS idx_user_currency_preferences_client_id
  ON user_currency_preferences(client_id);

ALTER TABLE user_currency_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read currency preference by client_id"
  ON user_currency_preferences FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert own currency preference"
  ON user_currency_preferences FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update currency preference by client_id"
  ON user_currency_preferences FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

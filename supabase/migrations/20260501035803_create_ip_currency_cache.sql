/*
  # Create IP Currency Cache

  1. New Tables
    - `ip_currency_cache`
      - `ip` (text, primary key) - visitor IP address
      - `currency` (text) - ISO currency code detected
      - `country` (text) - ISO country code detected
      - `detected_at` (timestamptz) - timestamp of detection

  2. Security
    - Enable RLS on `ip_currency_cache`
    - No public policies; only the service role (used by edge functions) can read/write.

  3. Indexes
    - Index on `detected_at` to support pruning.
*/

CREATE TABLE IF NOT EXISTS ip_currency_cache (
  ip text PRIMARY KEY,
  currency text NOT NULL DEFAULT 'USD',
  country text NOT NULL DEFAULT '',
  detected_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ip_currency_cache ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ip_currency_cache_detected_at
  ON ip_currency_cache (detected_at);

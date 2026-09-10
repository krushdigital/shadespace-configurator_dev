/*
# Create client_error_logs table (client-side crash telemetry)

1. Purpose
- Capture front-end load/render failures ("blank screen" reports) so we can
  identify which browsers, devices and code paths are affected.

2. New Tables
- `client_error_logs`
  - `id` (uuid, primary key)
  - `message` (text) — the error message
  - `stack` (text, nullable) — the JS stack trace if available
  - `source` (text) — where it was caught: 'error_boundary' | 'window_error' | 'unhandled_rejection' | 'quote_load' | other
  - `user_agent` (text, nullable) — full browser/OS/version UA string
  - `url` (text, nullable) — page URL where the failure occurred
  - `is_quote_link` (boolean, default false) — whether the failure happened while loading a quote link
  - `app_version` (text, nullable) — bundle build version
  - `created_at` (timestamptz, default now())

3. Security
- Enable RLS on `client_error_logs`.
- This is a no-auth (anon-key) storefront app, so allow INSERT for
  `anon, authenticated` (clients report their own crashes).
- No public SELECT/UPDATE/DELETE policies: diagnostic rows are read via the
  privileged service role in the admin/MCP context only, never exposed to the
  storefront client.

4. Notes
1. Insert-only from the client keeps the table append-only telemetry.
2. Index on `created_at` for recent-error queries; index on `is_quote_link`
   for filtering quote-link failures.
*/

CREATE TABLE IF NOT EXISTS client_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  stack text,
  source text NOT NULL DEFAULT 'unknown',
  user_agent text,
  url text,
  is_quote_link boolean NOT NULL DEFAULT false,
  app_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE client_error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_client_error_logs" ON client_error_logs;
CREATE POLICY "anon_insert_client_error_logs" ON client_error_logs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_client_error_logs_created_at
  ON client_error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_error_logs_is_quote_link
  ON client_error_logs (is_quote_link);

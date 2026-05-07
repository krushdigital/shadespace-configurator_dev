/*
  # Create quote_link_events table

  1. New Tables
    - `quote_link_events`
      - `id` (uuid, primary key)
      - `quote_id` (uuid, optional reference to saved_quotes)
      - `source` (text: 'email', 'pdf', 'admin', 'direct')
      - `landed_host` (text, hostname the customer actually landed on)
      - `had_token` (boolean)
      - `user_agent` (text)
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled
    - Anonymous insert allowed (clients and edge functions record events)
    - No select/update/delete for anon (admin-only access via service role)

  3. Notes
    - Used to verify cross-domain quote links are surviving Shopify market redirects
*/

CREATE TABLE IF NOT EXISTS quote_link_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid,
  source text NOT NULL DEFAULT 'direct',
  landed_host text DEFAULT '',
  had_token boolean DEFAULT false,
  user_agent text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_link_events_quote_id ON quote_link_events(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_link_events_created_at ON quote_link_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_link_events_landed_host ON quote_link_events(landed_host);

ALTER TABLE quote_link_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert link events"
  ON quote_link_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

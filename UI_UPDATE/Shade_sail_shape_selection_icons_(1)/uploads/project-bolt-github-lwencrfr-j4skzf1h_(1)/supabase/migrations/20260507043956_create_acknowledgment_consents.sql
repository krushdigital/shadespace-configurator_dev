/*
  # Acknowledgment consents audit log

  Replaces the four individual acknowledgment checkboxes on step 6 with a
  single "I agree to all" control. To preserve legal enforceability, every
  time a customer agrees we store a timestamped snapshot of the statements
  they agreed to.

  1. New Tables
    - `acknowledgment_consents`
      - `id` (uuid, primary key)
      - `quote_id` (uuid, nullable) - linked saved quote if any
      - `quote_reference` (text, nullable)
      - `customer_email` (text, nullable)
      - `agreed_at` (timestamptz)
      - `user_agent` (text)
      - `statements_version` (text) - e.g. v1-2026-05
      - `statements_snapshot` (text[]) - the exact statements shown at consent time
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled
    - Anonymous INSERT allowed (consent logged from client)
    - Authenticated SELECT allowed (admin/legal review)
*/

CREATE TABLE IF NOT EXISTS acknowledgment_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid,
  quote_reference text DEFAULT '',
  customer_email text DEFAULT '',
  agreed_at timestamptz NOT NULL DEFAULT now(),
  user_agent text NOT NULL DEFAULT '',
  statements_version text NOT NULL DEFAULT '',
  statements_snapshot text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE acknowledgment_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a consent"
  ON acknowledgment_consents FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can read consents"
  ON acknowledgment_consents FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_acknowledgment_consents_agreed_at
  ON acknowledgment_consents (agreed_at DESC);

/*
  # Create email_send_failures table for admin notifications

  1. New Tables
    - `email_send_failures`
      - `id` (uuid, primary key)
      - `recipient_email` (text) - the intended recipient
      - `quote_reference` (text) - associated quote reference
      - `quote_id` (uuid) - associated quote ID
      - `template_key` (text) - which email template was attempted
      - `failure_reason` (text) - why the email failed to send
      - `edge_function` (text) - which edge function reported the failure
      - `acknowledged` (boolean) - whether an admin has reviewed this
      - `acknowledged_by` (uuid) - admin who acknowledged
      - `acknowledged_at` (timestamptz) - when it was acknowledged
      - `created_at` (timestamptz) - when the failure occurred

  2. Security
    - Enable RLS on `email_send_failures` table
    - Only authenticated admin users can read/update
    - Service role (edge functions) can insert via bypassing RLS

  3. Notes
    - Edge functions insert using service_role key which bypasses RLS
    - Admin dashboard reads these to surface undelivered emails
    - Acknowledged flag lets admins mark failures as handled
*/

CREATE TABLE IF NOT EXISTS email_send_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  quote_reference text DEFAULT '',
  quote_id uuid,
  template_key text NOT NULL,
  failure_reason text NOT NULL DEFAULT 'unknown',
  edge_function text NOT NULL,
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_send_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated admins can read email_send_failures"
  ON email_send_failures
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated admins can update email_send_failures"
  ON email_send_failures
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_email_send_failures_created ON email_send_failures (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_failures_unacknowledged ON email_send_failures (acknowledged, created_at DESC) WHERE acknowledged = false;

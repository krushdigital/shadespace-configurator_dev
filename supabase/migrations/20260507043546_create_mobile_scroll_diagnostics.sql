/*
  # Mobile scroll diagnostics

  Captures a sampled record of mobile auto-scroll outcomes so we can verify
  the Chrome-viewport fix in useMobileGuidance and catch future browser-layout
  regressions.

  1. New Tables
    - `mobile_scroll_diagnostics`
      - `id` (uuid, primary key)
      - `element_id` (text)
      - `browser` (text) - coarse UA classification (chrome / brave / safari / other)
      - `user_agent` (text)
      - `inner_height` (integer)
      - `visual_viewport_height` (integer)
      - `target_scroll_y` (integer)
      - `final_scroll_y` (integer)
      - `align_mode` (text) - center / below-center / top
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled
    - Anonymous INSERT allowed (client telemetry)
    - Authenticated SELECT allowed (admin analysis)
*/

CREATE TABLE IF NOT EXISTS mobile_scroll_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  element_id text NOT NULL DEFAULT '',
  browser text NOT NULL DEFAULT '',
  user_agent text NOT NULL DEFAULT '',
  inner_height integer NOT NULL DEFAULT 0,
  visual_viewport_height integer NOT NULL DEFAULT 0,
  target_scroll_y integer NOT NULL DEFAULT 0,
  final_scroll_y integer NOT NULL DEFAULT 0,
  align_mode text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mobile_scroll_diagnostics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log scroll diagnostics"
  ON mobile_scroll_diagnostics FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can read scroll diagnostics"
  ON mobile_scroll_diagnostics FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_mobile_scroll_diagnostics_created
  ON mobile_scroll_diagnostics (created_at DESC);

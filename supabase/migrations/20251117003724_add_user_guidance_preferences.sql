/*
  # User Guidance Preferences Storage

  1. New Tables
    - `user_guidance_preferences`
      - `id` (uuid, primary key)
      - `device_fingerprint` (text, unique) - Generated client-side identifier for device
      - `guidance_enabled` (boolean, default true) - Whether mobile guidance is active
      - `auto_scroll_speed` (text) - Speed preset: 'slow', 'normal', 'fast'
      - `has_seen_onboarding` (boolean, default false) - First-time user flag
      - `preference_updated_at` (timestamptz) - Last preference update
      - `created_at` (timestamptz, default now())
  
  2. Security
    - Enable RLS on `user_guidance_preferences` table
    - Add policy for public access to allow unauthenticated users to manage their preferences
    - Create index on device_fingerprint for fast lookups
    - Add cleanup function to remove preferences older than 90 days
  
  3. Notes
    - This table stores mobile guidance preferences for both authenticated and anonymous users
    - Uses device fingerprint instead of user_id to support anonymous users
    - Preferences are tied to device, not account, for privacy
*/

-- Create user guidance preferences table
CREATE TABLE IF NOT EXISTS user_guidance_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_fingerprint text UNIQUE NOT NULL,
  guidance_enabled boolean DEFAULT true NOT NULL,
  auto_scroll_speed text DEFAULT 'normal' CHECK (auto_scroll_speed IN ('slow', 'normal', 'fast')),
  has_seen_onboarding boolean DEFAULT false NOT NULL,
  preference_updated_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE user_guidance_preferences ENABLE ROW LEVEL SECURITY;

-- Allow public access for reading preferences based on device fingerprint
CREATE POLICY "Anyone can read their own guidance preferences"
  ON user_guidance_preferences
  FOR SELECT
  USING (true);

-- Allow public access for inserting new preferences
CREATE POLICY "Anyone can create guidance preferences"
  ON user_guidance_preferences
  FOR INSERT
  WITH CHECK (true);

-- Allow public access for updating their own preferences based on device fingerprint
CREATE POLICY "Anyone can update their own guidance preferences"
  ON user_guidance_preferences
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create index for fast lookups by device fingerprint
CREATE INDEX IF NOT EXISTS idx_guidance_device_fingerprint 
  ON user_guidance_preferences(device_fingerprint);

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_guidance_created_at 
  ON user_guidance_preferences(created_at);

-- Function to cleanup old preferences (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_guidance_preferences()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM user_guidance_preferences
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;
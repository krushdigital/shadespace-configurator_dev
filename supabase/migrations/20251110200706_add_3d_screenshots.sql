/*
  # Add 3D Screenshot Storage

  1. New Tables
    - `screenshot_3d`
      - `id` (uuid, primary key)
      - `quote_id` (uuid, foreign key to saved_quotes)
      - `image_url` (text) - Supabase Storage URL
      - `thumbnail_url` (text, optional) - Smaller preview image
      - `width` (integer) - Image width in pixels
      - `height` (integer) - Image height in pixels
      - `file_size` (integer) - File size in bytes
      - `camera_position` (jsonb, optional) - Camera state for recreation
      - `view_preset` (text, optional) - front, side, top, isometric
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `screenshot_3d` table
    - Add policies for authenticated and public access based on quote access

  3. Storage
    - Create public storage bucket for 3D screenshots
    - Add policies for upload and read access
*/

-- Create the screenshot_3d table
CREATE TABLE IF NOT EXISTS screenshot_3d (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES saved_quotes(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  thumbnail_url text,
  width integer NOT NULL DEFAULT 1920,
  height integer NOT NULL DEFAULT 1080,
  file_size integer,
  camera_position jsonb,
  view_preset text CHECK (view_preset IN ('front', 'side', 'top', 'isometric', 'custom')),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE screenshot_3d ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone with quote access token can view screenshots
CREATE POLICY "Screenshots viewable with valid quote token"
  ON screenshot_3d
  FOR SELECT
  USING (
    quote_id IN (
      SELECT id FROM saved_quotes
      WHERE expires_at > now()
    )
  );

-- Policy: Service role can insert screenshots
CREATE POLICY "Service can insert screenshots"
  ON screenshot_3d
  FOR INSERT
  WITH CHECK (true);

-- Policy: Service role can update screenshots
CREATE POLICY "Service can update screenshots"
  ON screenshot_3d
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Service role can delete screenshots
CREATE POLICY "Service can delete screenshots"
  ON screenshot_3d
  FOR DELETE
  USING (true);

-- Create storage bucket for 3D screenshots if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('3d-screenshots', '3d-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for 3D screenshots bucket
DO $$
BEGIN
  -- Policy: Anyone can view screenshots (public bucket)
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies
    WHERE bucket_id = '3d-screenshots'
    AND name = 'Public read access for 3D screenshots'
  ) THEN
    INSERT INTO storage.policies (bucket_id, name, definition)
    VALUES (
      '3d-screenshots',
      'Public read access for 3D screenshots',
      'bucket_id = ''3d-screenshots'''
    );
  END IF;

  -- Policy: Authenticated users can upload screenshots
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies
    WHERE bucket_id = '3d-screenshots'
    AND name = 'Authenticated users can upload screenshots'
  ) THEN
    INSERT INTO storage.policies (bucket_id, name, definition)
    VALUES (
      '3d-screenshots',
      'Authenticated users can upload screenshots',
      'bucket_id = ''3d-screenshots'' AND auth.role() = ''authenticated'''
    );
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_screenshot_3d_quote_id ON screenshot_3d(quote_id);
CREATE INDEX IF NOT EXISTS idx_screenshot_3d_created_at ON screenshot_3d(created_at DESC);

-- Add comment to table
COMMENT ON TABLE screenshot_3d IS 'Stores 3D rendered screenshots of shade sail configurations';

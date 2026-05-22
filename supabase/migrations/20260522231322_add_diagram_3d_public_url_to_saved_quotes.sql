/*
  # Add 3D diagram URL to saved quotes

  1. Modified Tables
    - `saved_quotes`
      - `diagram_3d_public_url` (text, nullable) - Stores the publicly accessible URL for the 3D shade sail render captured at quote time

  2. Notes
    - This enables the PDF Studio and Email Studio to reference stored 3D renders
    - The column is nullable since older quotes won't have a 3D screenshot
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'diagram_3d_public_url'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN diagram_3d_public_url text;
  END IF;
END $$;

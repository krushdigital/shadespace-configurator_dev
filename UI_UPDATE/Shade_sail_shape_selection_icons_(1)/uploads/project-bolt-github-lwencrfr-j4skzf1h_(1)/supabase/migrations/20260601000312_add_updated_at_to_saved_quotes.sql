/*
  # Add updated_at column to saved_quotes

  1. Modified Tables
    - `saved_quotes`
      - Added `updated_at` (timestamptz, defaults to now(), auto-updates on row change)

  2. New Functions
    - `set_updated_at()` trigger function that sets updated_at = now() on every UPDATE

  3. Important Notes
    - Backfills existing rows with created_at value so automation delay logic works correctly
    - The evaluate-email-automations edge function relies on this column to determine
      which quotes have been idle long enough to trigger follow-up emails
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Backfill: set updated_at to the most recent of created_at or last_accessed_at
UPDATE saved_quotes
SET updated_at = GREATEST(created_at, COALESCE(last_accessed_at, created_at))
WHERE updated_at IS NULL OR updated_at = now();

-- Create trigger function to auto-update the column on every row modification
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

-- Attach trigger (idempotent via DROP IF EXISTS)
DROP TRIGGER IF EXISTS trg_saved_quotes_updated_at ON saved_quotes;
CREATE TRIGGER trg_saved_quotes_updated_at
  BEFORE UPDATE ON saved_quotes
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

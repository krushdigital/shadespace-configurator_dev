/*
  # Add Quote Naming and Customer Reference Fields

  1. Schema Changes
    - Add `quote_name` column (text, not null with default) - User-friendly quote identifier, max 100 chars
    - Add `customer_reference` column (text, nullable) - Optional customer/project reference, max 50 chars
    - Add `name_auto_generated` column (boolean) - Tracks if name was user-provided or auto-generated

  2. Indexes
    - Create full-text search index on quote_name for fast searching
    - Create index on customer_reference for filtering
    - Create combined index for search optimization

  3. Default Value Function
    - Create function to generate default quote names from config data
    - Format: "[Corners]-Corner [Fabric] Shade Sail - [Date]"

  4. Data Migration
    - Backfill existing quotes with auto-generated names based on their config_data
    - Set name_auto_generated to true for all existing quotes

  5. Notes
    - Character limits enforced at database level for data integrity
    - Full-text search enabled for efficient quote discovery
    - Backward compatible with existing quotes
*/

-- Add new columns to saved_quotes table
DO $$
BEGIN
  -- Add quote_name column with temporary nullable constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'quote_name'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN quote_name text;
  END IF;

  -- Add customer_reference column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'customer_reference'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN customer_reference text;
  END IF;

  -- Add name_auto_generated column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'name_auto_generated'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN name_auto_generated boolean DEFAULT true;
  END IF;
END $$;

-- Function to generate default quote name from config data
CREATE OR REPLACE FUNCTION generate_default_quote_name(
  config_data jsonb,
  created_date timestamptz
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  corners int;
  fabric_type text;
  fabric_color text;
  fabric_label text;
  date_str text;
  result text;
BEGIN
  -- Extract values from config_data
  corners := COALESCE((config_data->>'corners')::int, 3);
  fabric_type := config_data->>'fabricType';
  fabric_color := config_data->>'fabricColor';

  -- Map fabric type to label
  fabric_label := CASE fabric_type
    WHEN 'monotec370' THEN 'Monotec'
    WHEN 'extrablock330' THEN 'ExtraBlock'
    WHEN 'shadetec320' THEN 'Shadetec'
    ELSE 'Custom'
  END;

  -- Format date as "Jan 15" or "Jan 15, 2025" if not current year
  date_str := TO_CHAR(created_date, 'Mon DD');
  IF EXTRACT(YEAR FROM created_date) != EXTRACT(YEAR FROM NOW()) THEN
    date_str := TO_CHAR(created_date, 'Mon DD, YYYY');
  END IF;

  -- Build quote name
  result := corners || '-Corner ' || fabric_label;

  -- Add color if available
  IF fabric_color IS NOT NULL AND fabric_color != '' THEN
    result := result || ' ' || fabric_color;
  END IF;

  result := result || ' Shade Sail - ' || date_str;

  -- Ensure it doesn't exceed 100 characters
  IF LENGTH(result) > 100 THEN
    result := SUBSTRING(result FROM 1 FOR 97) || '...';
  END IF;

  RETURN result;
END;
$$;

-- Backfill existing quotes with auto-generated names
UPDATE saved_quotes
SET
  quote_name = generate_default_quote_name(config_data, created_at),
  name_auto_generated = true
WHERE quote_name IS NULL;

-- Now make quote_name NOT NULL with a default
ALTER TABLE saved_quotes
  ALTER COLUMN quote_name SET DEFAULT '',
  ALTER COLUMN quote_name SET NOT NULL;

-- Add check constraints for character limits
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'quote_name_length_check'
  ) THEN
    ALTER TABLE saved_quotes
      ADD CONSTRAINT quote_name_length_check
      CHECK (LENGTH(quote_name) <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customer_reference_length_check'
  ) THEN
    ALTER TABLE saved_quotes
      ADD CONSTRAINT customer_reference_length_check
      CHECK (customer_reference IS NULL OR LENGTH(customer_reference) <= 50);
  END IF;
END $$;

-- Create indexes for search and filtering
CREATE INDEX IF NOT EXISTS idx_saved_quotes_name
  ON saved_quotes(quote_name);

CREATE INDEX IF NOT EXISTS idx_saved_quotes_customer_ref
  ON saved_quotes(customer_reference)
  WHERE customer_reference IS NOT NULL;

-- Create full-text search index using GIN for better search performance
-- This enables fast case-insensitive partial matching on quote names
CREATE INDEX IF NOT EXISTS idx_saved_quotes_name_search
  ON saved_quotes USING gin(to_tsvector('english', quote_name));

CREATE INDEX IF NOT EXISTS idx_saved_quotes_ref_search
  ON saved_quotes USING gin(to_tsvector('english', COALESCE(customer_reference, '')))
  WHERE customer_reference IS NOT NULL;

-- Create combined index for common query patterns (email + date ordering)
CREATE INDEX IF NOT EXISTS idx_saved_quotes_email_created
  ON saved_quotes(customer_email, created_at DESC)
  WHERE customer_email IS NOT NULL;

-- Add comment to document the new columns
COMMENT ON COLUMN saved_quotes.quote_name IS
  'User-friendly quote identifier, max 100 characters. Auto-generated if not provided.';

COMMENT ON COLUMN saved_quotes.customer_reference IS
  'Optional customer or project reference number, max 50 characters.';

COMMENT ON COLUMN saved_quotes.name_auto_generated IS
  'Boolean flag indicating if quote_name was auto-generated (true) or user-provided (false).';

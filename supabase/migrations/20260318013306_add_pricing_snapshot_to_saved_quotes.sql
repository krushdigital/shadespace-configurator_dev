/*
  # Add pricing snapshot to saved quotes

  1. Modified Tables
    - `saved_quotes`
      - Added `pricing_snapshot` (jsonb, nullable) - Captures the exact pricing settings
        (market markup, Zonos/DHL markup, exchange rate) at the time the quote was saved.
        This ensures quotes can be reviewed with their original pricing even after
        rates change in the pricing_settings table.

  2. Important Notes
    - Existing quotes will have NULL for pricing_snapshot (legacy data)
    - New quotes going forward will capture pricing settings at save time
    - This supports accurate price reproduction when revisiting old quotes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'pricing_snapshot'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN pricing_snapshot jsonb;
  END IF;
END $$;

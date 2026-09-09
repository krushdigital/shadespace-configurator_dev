/*
# Add checkout_snapshot column to saved_quotes

## Purpose
Stores the exact configuration that was sent to the Shopify cart at checkout time.
This snapshot becomes the authoritative source for PDF generation after purchase,
preventing mismatches between the Shopify order line items and the generated PDFs.

## New Columns
- `checkout_snapshot` (jsonb, nullable) — Full configuration snapshot captured at
  the moment of cart submission. Contains config_data, calculations_data, locked_total,
  hardware selections, and fabric details exactly as sent to Shopify.

## Important Notes
1. This column is populated only when the customer clicks "Add to Cart".
2. The serve-order-pdf edge function will prefer this snapshot over config_data
   when generating PDFs for purchased orders.
3. Existing orders are unaffected — they continue to use config_data as before.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'saved_quotes'
      AND column_name = 'checkout_snapshot'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN checkout_snapshot jsonb;
    COMMENT ON COLUMN saved_quotes.checkout_snapshot IS
      'Authoritative config snapshot captured at Add-to-Cart time. Used for PDF generation on purchased orders.';
  END IF;
END $$;

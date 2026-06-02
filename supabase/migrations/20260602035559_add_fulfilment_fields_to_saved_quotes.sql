/*
  # Add Fulfilment Fields to Saved Quotes

  1. Modified Tables
    - `saved_quotes`
      - `shipping_address` (jsonb) — Shopify shipping address backfilled from order webhook
      - `estimated_weight_kg` (numeric) — calculated sail weight for shipping
      - `order_notes` (text) — internal order notes from Shopify or staff

  2. Purpose
    - These fields are populated by the Shopify order webhook when an order is confirmed
    - Used by the serve-order-pdf edge function to render the Order Fulfilment PDF
    - Allows staff to see shipping destination and notes on the fulfilment document
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'shipping_address'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN shipping_address jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'estimated_weight_kg'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN estimated_weight_kg numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'order_notes'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN order_notes text;
  END IF;
END $$;

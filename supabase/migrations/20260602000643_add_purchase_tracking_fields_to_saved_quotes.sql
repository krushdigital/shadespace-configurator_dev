/*
  # Add Purchase Tracking Fields to Saved Quotes

  1. Modified Tables
    - `saved_quotes`
      - Add `shopify_order_id` (text, nullable) - Shopify order ID pushed from external order sync service
      - Add `shopify_order_number` (text, nullable) - Human-readable order number (e.g., "#1042")
      - Add `purchased_at` (timestamptz, nullable) - When the purchase was confirmed
      - Update status check constraint to include 'purchased' as a valid value

  2. Indexes
    - Add index on `shopify_order_id` for efficient lookup when receiving order data
    - Add partial index on `status = 'purchased'` for admin filtering

  3. Notes
    - The external Digital Ocean service pushes purchase data to Supabase via an Edge Function
    - Once a quote is marked 'purchased', email automations will be suppressed
*/

-- Add shopify_order_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'shopify_order_id'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN shopify_order_id text;
  END IF;
END $$;

-- Add shopify_order_number column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'shopify_order_number'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN shopify_order_number text;
  END IF;
END $$;

-- Add purchased_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_quotes' AND column_name = 'purchased_at'
  ) THEN
    ALTER TABLE saved_quotes ADD COLUMN purchased_at timestamptz;
  END IF;
END $$;

-- Update status check constraint to include 'purchased'
ALTER TABLE saved_quotes DROP CONSTRAINT IF EXISTS saved_quotes_status_check;
ALTER TABLE saved_quotes ADD CONSTRAINT saved_quotes_status_check
  CHECK (status = ANY (ARRAY['in_progress'::text, 'quote_ready'::text, 'completed'::text, 'expired'::text, 'purchased'::text]));

-- Index on shopify_order_id for fast lookup
CREATE INDEX IF NOT EXISTS idx_saved_quotes_shopify_order_id
  ON saved_quotes (shopify_order_id)
  WHERE shopify_order_id IS NOT NULL;

-- Partial index for admin filtering on purchased status
CREATE INDEX IF NOT EXISTS idx_saved_quotes_purchased
  ON saved_quotes (purchased_at DESC)
  WHERE status = 'purchased';

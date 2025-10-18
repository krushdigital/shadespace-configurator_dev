/*
  # Add Shopify Customer Tracking to Saved Quotes (FIX)

  1. New Columns
    - `shopify_customer_id` (text) - Stores the Shopify customer ID when customer is added
    - `cart_conversion_tracked` (boolean) - Tracks if quote was converted to cart
    - `cart_conversion_at` (timestamptz) - Timestamp when quote was converted
    - `source` (text) - Tracks how the quote was saved (manual_save or email_summary)

  2. Indexes
    - Index on `shopify_customer_id` for faster customer lookups
    - Index on `cart_conversion_tracked` and `created_at` for conversion analytics
    - Index on `source` for analytics

  3. Purpose
    - Enable Shopify customer database integration for quote saves
    - Track quote-to-cart conversion rates
    - Distinguish between different quote save sources
*/

-- Add new columns to saved_quotes table
ALTER TABLE saved_quotes
ADD COLUMN IF NOT EXISTS shopify_customer_id TEXT,
ADD COLUMN IF NOT EXISTS cart_conversion_tracked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cart_conversion_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual_save';

-- Add check constraint for source column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'saved_quotes_source_check'
  ) THEN
    ALTER TABLE saved_quotes
      ADD CONSTRAINT saved_quotes_source_check
      CHECK (source IN ('manual_save', 'email_summary'));
  END IF;
END $$;

-- Add index for customer lookups
CREATE INDEX IF NOT EXISTS idx_saved_quotes_shopify_customer_id
ON saved_quotes(shopify_customer_id);

-- Add index for conversion tracking
CREATE INDEX IF NOT EXISTS idx_saved_quotes_cart_conversion
ON saved_quotes(cart_conversion_tracked, created_at);

-- Add index for source analytics
CREATE INDEX IF NOT EXISTS idx_saved_quotes_source
ON saved_quotes(source);

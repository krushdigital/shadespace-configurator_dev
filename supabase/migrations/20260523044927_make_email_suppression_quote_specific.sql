/*
  # Make Email Suppression Quote-Specific

  1. Modified Tables
    - `email_suppressed_customers`
      - Added `quote_id` (uuid, nullable) - links suppression to a specific saved_quote
      - Added `quote_reference` (text, nullable) - the human-readable quote reference from Shopify order
      - Changed unique constraint from (email) to (email, quote_id) for per-quote suppression
      - Kept fallback: rows with quote_id IS NULL still act as blanket suppressions

  2. Notes
    - When a Shopify order contains a quote reference (in notes or line item properties),
      the suppression is linked to that specific quote_id
    - The automation evaluator now only skips sending for the specific quote that was purchased,
      not all quotes from that customer
    - A single order may produce multiple suppression rows if it contains multiple quote references
*/

-- Add quote_id column to link suppression to a specific saved quote
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_suppressed_customers' AND column_name = 'quote_id'
  ) THEN
    ALTER TABLE email_suppressed_customers ADD COLUMN quote_id uuid REFERENCES saved_quotes(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_suppressed_customers' AND column_name = 'quote_reference'
  ) THEN
    ALTER TABLE email_suppressed_customers ADD COLUMN quote_reference text;
  END IF;
END $$;

-- Drop the old unique index on email alone
DROP INDEX IF EXISTS idx_email_suppressed_customers_email;

-- Create new unique index on (email, quote_id) - allows multiple suppressions per email
-- For rows with NULL quote_id (blanket suppression), use COALESCE to maintain uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_suppressed_email_quote
  ON email_suppressed_customers (lower(email), COALESCE(quote_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Index for fast lookup by quote_id
CREATE INDEX IF NOT EXISTS idx_email_suppressed_quote_id
  ON email_suppressed_customers (quote_id)
  WHERE quote_id IS NOT NULL;

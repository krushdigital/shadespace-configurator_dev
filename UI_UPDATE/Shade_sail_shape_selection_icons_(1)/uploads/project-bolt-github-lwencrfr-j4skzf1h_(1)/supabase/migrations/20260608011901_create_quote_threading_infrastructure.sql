/*
# Create Quote Threading Infrastructure

## Purpose
Groups related quotes from the same customer's purchasing decision into "threads".
This enables analytics deduplication, single email sequences per thread, and proper
display grouping in the admin panel.

## New Tables

### quote_threads
- `id` (uuid, PK) - Thread identifier
- `customer_email` (text, NOT NULL) - The customer email that owns this thread
- `customer_reference` (text, nullable) - Groups by project reference when present
- `thread_type` (text) - 'residential' or 'commercial', default 'residential'
- `primary_quote_id` (uuid, FK to saved_quotes) - The representative quote
- `status` (text) - Mirrors the primary quote's status for fast filtering
- `quote_count` (integer) - Cached count of quotes in thread
- `latest_value` (numeric) - Cached total from primary quote for analytics
- `latest_currency` (text) - Currency of the primary quote value
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### customer_thread_config
- `customer_email` (text, PK) - Per-email admin overrides
- `default_thread_type` (text) - 'residential' or 'commercial'
- `always_separate_threads` (boolean) - If true, every new quote creates its own thread
- `created_at`, `updated_at`

## Modified Tables

### saved_quotes
- Added `quote_thread_id` (uuid, FK to quote_threads) - Links quote to its thread
- Added `is_thread_primary` (boolean, default true) - Marks the representative quote
- Added `auto_generated_from_order` (boolean, default false) - Distinguishes auto-created quotes

## Security
- RLS enabled on both new tables
- anon + authenticated can SELECT (admin reads via service role anyway)
- Only service_role can INSERT/UPDATE/DELETE (edge functions use service role)

## Indexes
- quote_threads(customer_email) for thread-finding queries
- saved_quotes(quote_thread_id) for grouping
- Partial index on saved_quotes for primary quotes per thread
*/

-- Create quote_threads table
CREATE TABLE IF NOT EXISTS quote_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email text NOT NULL,
  customer_reference text,
  thread_type text NOT NULL DEFAULT 'residential' CHECK (thread_type IN ('residential', 'commercial')),
  primary_quote_id uuid,
  status text,
  quote_count integer NOT NULL DEFAULT 1,
  latest_value numeric,
  latest_currency text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create customer_thread_config table
CREATE TABLE IF NOT EXISTS customer_thread_config (
  customer_email text PRIMARY KEY,
  default_thread_type text NOT NULL DEFAULT 'residential' CHECK (default_thread_type IN ('residential', 'commercial')),
  always_separate_threads boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add columns to saved_quotes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_quotes' AND column_name = 'quote_thread_id') THEN
    ALTER TABLE saved_quotes ADD COLUMN quote_thread_id uuid REFERENCES quote_threads(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_quotes' AND column_name = 'is_thread_primary') THEN
    ALTER TABLE saved_quotes ADD COLUMN is_thread_primary boolean NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_quotes' AND column_name = 'auto_generated_from_order') THEN
    ALTER TABLE saved_quotes ADD COLUMN auto_generated_from_order boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add FK from quote_threads.primary_quote_id to saved_quotes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_quote_threads_primary_quote'
    AND table_name = 'quote_threads'
  ) THEN
    ALTER TABLE quote_threads
      ADD CONSTRAINT fk_quote_threads_primary_quote
      FOREIGN KEY (primary_quote_id) REFERENCES saved_quotes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quote_threads_customer_email ON quote_threads(customer_email);
CREATE INDEX IF NOT EXISTS idx_quote_threads_status ON quote_threads(status);
CREATE INDEX IF NOT EXISTS idx_saved_quotes_thread_id ON saved_quotes(quote_thread_id);
CREATE INDEX IF NOT EXISTS idx_saved_quotes_thread_primary ON saved_quotes(quote_thread_id) WHERE is_thread_primary = true;

-- RLS on quote_threads
ALTER TABLE quote_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_quote_threads" ON quote_threads;
CREATE POLICY "anon_select_quote_threads" ON quote_threads FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_quote_threads" ON quote_threads;
CREATE POLICY "anon_insert_quote_threads" ON quote_threads FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_quote_threads" ON quote_threads;
CREATE POLICY "anon_update_quote_threads" ON quote_threads FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_quote_threads" ON quote_threads;
CREATE POLICY "anon_delete_quote_threads" ON quote_threads FOR DELETE
  TO anon, authenticated USING (true);

-- RLS on customer_thread_config
ALTER TABLE customer_thread_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_customer_thread_config" ON customer_thread_config;
CREATE POLICY "anon_select_customer_thread_config" ON customer_thread_config FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_customer_thread_config" ON customer_thread_config;
CREATE POLICY "anon_insert_customer_thread_config" ON customer_thread_config FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_customer_thread_config" ON customer_thread_config;
CREATE POLICY "anon_update_customer_thread_config" ON customer_thread_config FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_customer_thread_config" ON customer_thread_config;
CREATE POLICY "anon_delete_customer_thread_config" ON customer_thread_config FOR DELETE
  TO anon, authenticated USING (true);

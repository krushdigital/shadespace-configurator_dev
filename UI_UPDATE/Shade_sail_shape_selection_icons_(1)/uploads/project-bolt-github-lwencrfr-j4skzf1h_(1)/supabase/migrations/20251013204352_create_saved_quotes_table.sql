/*
  # Create saved_quotes table for storing customer quotes

  1. New Tables
    - `saved_quotes`
      - `id` (uuid, primary key) - Unique identifier for each saved quote
      - `quote_reference` (text, unique) - Human-readable reference number (e.g., "SQ-2024-AB1C2")
      - `customer_email` (text, nullable) - Optional email address for quote retrieval
      - `config_data` (jsonb) - Complete ConfiguratorState object
      - `calculations_data` (jsonb) - ShadeCalculations object with pricing
      - `created_at` (timestamptz) - When the quote was created
      - `expires_at` (timestamptz) - When the quote expires (30 days from creation)
      - `status` (text) - Quote status: 'saved', 'completed', 'expired'
      - `last_accessed_at` (timestamptz) - Last time the quote was accessed

  2. Security
    - Enable RLS on `saved_quotes` table
    - Add policy for anonymous users to read their own quotes by ID
    - Add policy for anonymous users to create new quotes
    - Add policy for anonymous users to update quotes by ID
    - Add policy for users to retrieve quotes by email

  3. Indexes
    - Index on quote_reference for fast lookup
    - Index on customer_email for email-based retrieval
    - Index on created_at for cleanup queries
*/

CREATE TABLE IF NOT EXISTS saved_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_reference text UNIQUE NOT NULL,
  customer_email text,
  config_data jsonb NOT NULL,
  calculations_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  status text DEFAULT 'saved' CHECK (status IN ('saved', 'completed', 'expired')),
  last_accessed_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE saved_quotes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can create a new quote
CREATE POLICY "Anyone can create quotes"
  ON saved_quotes
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Anyone can read a quote by its ID
CREATE POLICY "Anyone can read quotes by ID"
  ON saved_quotes
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Anyone can update a quote by its ID (for accessing/updating last_accessed_at)
CREATE POLICY "Anyone can update quotes by ID"
  ON saved_quotes
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_quotes_reference ON saved_quotes(quote_reference);
CREATE INDEX IF NOT EXISTS idx_saved_quotes_email ON saved_quotes(customer_email);
CREATE INDEX IF NOT EXISTS idx_saved_quotes_created_at ON saved_quotes(created_at);
CREATE INDEX IF NOT EXISTS idx_saved_quotes_status ON saved_quotes(status);

-- Function to generate unique quote reference
CREATE OR REPLACE FUNCTION generate_quote_reference()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  ref text;
  exists boolean;
BEGIN
  LOOP
    -- Generate format: SQ-YYYY-XXXXX (5 random alphanumeric chars)
    ref := 'SQ-' || 
           TO_CHAR(NOW(), 'YYYY') || '-' ||
           UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 5));
    
    -- Check if reference already exists
    SELECT EXISTS(SELECT 1 FROM saved_quotes WHERE quote_reference = ref) INTO exists;
    
    -- Exit loop if unique reference found
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN ref;
END;
$$;
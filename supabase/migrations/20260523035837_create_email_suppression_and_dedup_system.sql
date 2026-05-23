/*
  # Email Suppression System - Shopify Order Check + Per-Email Deduplication

  1. New Tables
    - `email_suppressed_customers`
      - `id` (uuid, primary key)
      - `email` (text, unique, lowercase)
      - `shopify_customer_id` (text, nullable)
      - `first_order_at` (timestamptz, nullable)
      - `suppressed_at` (timestamptz, default now)
      - `reason` (text, default 'shopify_order_placed')
      - `order_id` (text, nullable)
    - `email_sync_state`
      - `id` (text, primary key) - named sync job identifier
      - `last_synced_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Modified Tables
    - `email_automations`
      - Added `max_sends_per_email` (integer, nullable) - caps sends per unique email
      - Added `cooldown_days` (integer, nullable, default 7) - skip if email received automation within N days
      - Added `suppress_if_purchased` (boolean, default true) - honor order suppression

  3. Security
    - RLS enabled on both new tables
    - Policies for service-role and admin access only
    - Index on email_suppressed_customers.email for fast lookups

  4. Notes
    - max_sends_per_email: null = no limit, 1 = once per email regardless of quotes
    - cooldown_days: null = no cooldown, 7 = skip if any automation sent within 7 days
    - suppress_if_purchased: per-automation toggle for order suppression
*/

-- 1. Create email_suppressed_customers table
CREATE TABLE IF NOT EXISTS email_suppressed_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  shopify_customer_id text,
  first_order_at timestamptz,
  suppressed_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL DEFAULT 'shopify_order_placed',
  order_id text
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_suppressed_customers_email
  ON email_suppressed_customers (lower(email));

CREATE INDEX IF NOT EXISTS idx_email_suppressed_customers_shopify_id
  ON email_suppressed_customers (shopify_customer_id)
  WHERE shopify_customer_id IS NOT NULL;

ALTER TABLE email_suppressed_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage suppressed customers"
  ON email_suppressed_customers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Create email_sync_state table
CREATE TABLE IF NOT EXISTS email_sync_state (
  id text PRIMARY KEY,
  last_synced_at timestamptz NOT NULL DEFAULT '2020-01-01T00:00:00Z',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage sync state"
  ON email_sync_state
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed the initial sync state for shopify orders
INSERT INTO email_sync_state (id, last_synced_at)
VALUES ('shopify_orders_sync', now() - interval '60 days')
ON CONFLICT (id) DO NOTHING;

-- 3. Add new columns to email_automations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_automations' AND column_name = 'max_sends_per_email'
  ) THEN
    ALTER TABLE email_automations ADD COLUMN max_sends_per_email integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_automations' AND column_name = 'cooldown_days'
  ) THEN
    ALTER TABLE email_automations ADD COLUMN cooldown_days integer DEFAULT 7;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_automations' AND column_name = 'suppress_if_purchased'
  ) THEN
    ALTER TABLE email_automations ADD COLUMN suppress_if_purchased boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- 4. Set sensible defaults on existing automations
UPDATE email_automations
SET max_sends_per_email = 1,
    cooldown_days = 7,
    suppress_if_purchased = true
WHERE max_sends_per_email IS NULL;

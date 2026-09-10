/*
  # Add per-currency presentment prices to hardware catalog

  1. Changes
    - Adds a `prices` JSONB column to `hardware_catalog` to store a map of
      currency code -> numeric amount as returned by Shopify's
      `@inContext(country:)` presentment pricing. Example:
        { "NZD": 12.50, "AUD": 11.20, "USD": 7.80 }
    - Adds a `presentment_synced_at` timestamptz so admins can see when
      per-currency prices were last refreshed from Shopify.
    - Adds an equivalent `prices` JSONB column to `hardware_packs` for
      packs that have a price_nzd_override (so those can also be
      displayed in the user's local currency directly from Shopify).

  2. Security
    - RLS was already enabled on both tables; the existing policies
      continue to cover the new columns. No policy changes required.

  3. Notes
    1. `prices` defaults to an empty JSON object `'{}'::jsonb` so
       existing reads never get null; falling back to `price_nzd` is
       handled in application code.
    2. Nothing in this migration removes or alters existing columns.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hardware_catalog' AND column_name = 'prices'
  ) THEN
    ALTER TABLE hardware_catalog
      ADD COLUMN prices jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hardware_catalog' AND column_name = 'presentment_synced_at'
  ) THEN
    ALTER TABLE hardware_catalog
      ADD COLUMN presentment_synced_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hardware_packs' AND column_name = 'prices'
  ) THEN
    ALTER TABLE hardware_packs
      ADD COLUMN prices jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

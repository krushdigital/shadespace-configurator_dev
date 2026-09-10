/*
  # Add unique constraint on hardware_catalog.shopify_variant_id

  1. Changes
    - Adds a standard UNIQUE constraint on `hardware_catalog.shopify_variant_id`
      so Supabase upserts using `onConflict: "shopify_variant_id"` work.
    - The existing partial unique index
      (`hardware_catalog_variant_unique WHERE shopify_variant_id IS NOT NULL`)
      cannot be matched by ON CONFLICT through PostgREST.
    - NULLs remain distinct in PostgreSQL UNIQUE by default, so existing rows
      with NULL shopify_variant_id (manually seeded) are unaffected.

  2. Safety
    - Uses IF NOT EXISTS guard to stay idempotent.
    - No data is changed or deleted.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'hardware_catalog_shopify_variant_id_key'
      AND conrelid = 'hardware_catalog'::regclass
  ) THEN
    ALTER TABLE hardware_catalog
      ADD CONSTRAINT hardware_catalog_shopify_variant_id_key
      UNIQUE (shopify_variant_id);
  END IF;
END $$;

/*
  # Seed default hardware pack items

  1. Purpose
    - Existing `hardware_packs` rows have empty `items` jsonb arrays.
    - Without items the new PDF "Corner Hardware Breakdown" and "Bill of Materials"
      blocks render no contents for orders that include the standard pack.
    - This migration backfills `items` on every default pack with the standard
      tensioning kit composition (per-corner turnbuckle + D-shackle).

  2. Composition (per corner)
    - 1x Turnbuckle Jaw-Jaw (Frame Type) SS 316-08mm  (sku K312-8)
    - 1x D-Shackle SS 316-08mm                        (sku K360-8)
    The pack ships N of each for an N-corner sail.

  3. Safety
    - Only updates rows where `items` is currently empty (`'[]'::jsonb` or null).
    - Catalog ids resolved at runtime from sku to remain stable across environments.
    - Idempotent: subsequent runs with non-empty items are skipped.
*/

DO $$
DECLARE
  turnbuckle_id uuid;
  dshackle_id uuid;
  pack_record record;
BEGIN
  SELECT id INTO turnbuckle_id FROM hardware_catalog WHERE sku = 'K312-8' LIMIT 1;
  SELECT id INTO dshackle_id FROM hardware_catalog WHERE sku = 'K360-8' LIMIT 1;

  IF turnbuckle_id IS NULL OR dshackle_id IS NULL THEN
    RAISE NOTICE 'Hardware catalog seed entries missing; skipping pack item backfill';
    RETURN;
  END IF;

  FOR pack_record IN
    SELECT id, corners
    FROM hardware_packs
    WHERE is_default = true
      AND is_active = true
      AND (items IS NULL OR items = '[]'::jsonb)
  LOOP
    UPDATE hardware_packs
    SET items = jsonb_build_array(
      jsonb_build_object('catalog_id', turnbuckle_id::text, 'qty', pack_record.corners),
      jsonb_build_object('catalog_id', dshackle_id::text, 'qty', pack_record.corners)
    )
    WHERE id = pack_record.id;
  END LOOP;
END $$;

/*
  # Add Grease Bottle to All Hardware Packs

  1. Changes
    - Appends "Nulan Grease Tube (50ml)" (qty: 1) to every active default hardware pack
    - Covers all 12 packs: webbing and cabled, 3-8 corners
    - Idempotent: only adds if not already present in the items array

  2. Important Notes
    - The grease bottle catalog_id is 83d9413c-0602-45de-95bf-9e5a31b8d645
    - This does not affect pricing; the grease is included as part of the hardware kit
*/

DO $$
DECLARE
  grease_id uuid := '83d9413c-0602-45de-95bf-9e5a31b8d645';
  pack_row RECORD;
BEGIN
  FOR pack_row IN
    SELECT id, items
    FROM hardware_packs
    WHERE is_active = true AND is_default = true
  LOOP
    -- Only add if grease is not already in the items array
    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(pack_row.items, '[]'::jsonb)) elem
      WHERE elem->>'catalog_id' = grease_id::text
    ) THEN
      UPDATE hardware_packs
      SET items = COALESCE(items, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object('catalog_id', grease_id::text, 'qty', 1)
      )
      WHERE id = pack_row.id;
    END IF;
  END LOOP;
END $$;

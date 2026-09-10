/*
  # Hardware catalog for per-corner selection

  1. New tables
    - `hardware_categories`: grouping labels shown as section headers inside the
      hardware selection modal ("BOW SHACKLE", "CAPTIVE D SHACKLE", etc.).
      Columns: `id` (text key, e.g. `bow_shackle`), `label`, `display_order`, `is_active`.
    - `hardware_catalog`: individual products available for per-corner selection,
      mirrored from the Shopify catalog. Columns include Shopify identifiers,
      SKU, name, description, material, image URL, price in NZD, category link,
      and admin ordering flags. A deduction column is reserved for future wire
      length calculations (e.g. turnbuckles shortening the cable).
    - `hardware_packs`: standard hardware bundle used by the "Standard Pack" path.
      Rows are keyed by `edge_type` and `corners`. `items` is a jsonb array of
      `{ catalog_id, qty }`. `price_nzd_override` lets admin pin the total.

  2. Row Level Security
    - All three tables have RLS enabled.
    - Public read (anon + authenticated) so the configurator can list hardware.
    - Writes restricted to service role via admin edge functions (no policy
      added — this defaults to deny).

  3. Safety
    - Guarded with IF NOT EXISTS everywhere.
    - Indexes on the active + display order and category for fast listing.
*/

CREATE TABLE IF NOT EXISTS hardware_categories (
  id text PRIMARY KEY,
  label text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hardware_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_product_id text,
  shopify_variant_id text,
  shopify_handle text,
  sku text,
  name text NOT NULL,
  short_description text NOT NULL DEFAULT '',
  long_description text NOT NULL DEFAULT '',
  material text NOT NULL DEFAULT '316 Marine Grade Stainless Steel',
  image_url text NOT NULL DEFAULT '',
  category_id text REFERENCES hardware_categories(id) ON DELETE SET NULL,
  price_nzd numeric NOT NULL DEFAULT 0 CHECK (price_nzd >= 0),
  compare_at_nzd numeric CHECK (compare_at_nzd IS NULL OR compare_at_nzd >= 0),
  deduction_mm integer NOT NULL DEFAULT 0,
  edge_types text[] NOT NULL DEFAULT ARRAY['webbing','cabled']::text[],
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS hardware_catalog_variant_unique
  ON hardware_catalog(shopify_variant_id)
  WHERE shopify_variant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS hardware_catalog_active_order
  ON hardware_catalog(is_active, display_order);

CREATE INDEX IF NOT EXISTS hardware_catalog_category
  ON hardware_catalog(category_id);

CREATE TABLE IF NOT EXISTS hardware_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Standard Hardware Pack',
  edge_type text NOT NULL CHECK (edge_type IN ('webbing','cabled')),
  corners integer NOT NULL CHECK (corners BETWEEN 3 AND 8),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  price_nzd_override numeric CHECK (price_nzd_override IS NULL OR price_nzd_override >= 0),
  is_default boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS hardware_packs_edge_corners_default
  ON hardware_packs(edge_type, corners)
  WHERE is_default = true;

ALTER TABLE hardware_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE hardware_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE hardware_packs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='hardware_categories' AND policyname='Anyone can read hardware categories') THEN
    CREATE POLICY "Anyone can read hardware categories"
      ON hardware_categories FOR SELECT TO anon, authenticated USING (is_active = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='hardware_catalog' AND policyname='Anyone can read active hardware') THEN
    CREATE POLICY "Anyone can read active hardware"
      ON hardware_catalog FOR SELECT TO anon, authenticated USING (is_active = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='hardware_packs' AND policyname='Anyone can read active hardware packs') THEN
    CREATE POLICY "Anyone can read active hardware packs"
      ON hardware_packs FOR SELECT TO anon, authenticated USING (is_active = true);
  END IF;
END $$;

-- Seed baseline categories (10 common classes). Admin can add more later.
INSERT INTO hardware_categories (id, label, display_order) VALUES
  ('chain', 'Chain', 10),
  ('ratchet_kit', 'Ratchet Kit', 20),
  ('bow_shackle', 'Bow Shackle', 30),
  ('captive_d_shackle', 'Captive D Shackle', 40),
  ('d_shackle', 'D Shackle', 50),
  ('turnbuckle_hook_eye', 'Turnbuckle Hook-Eye (Frame Type)', 60),
  ('turnbuckle_jaw_jaw', 'Turnbuckle Jaw-Jaw (Frame Type)', 70),
  ('eye_bolt', 'Eye Bolt', 80),
  ('pad_eye', 'Pad Eye', 90),
  ('snap_hook', 'Snap Hook', 100)
ON CONFLICT (id) DO NOTHING;

/*
  # Hardware Catalog Admin Curation

  1. Changes
    - Adds `admin_hidden` (boolean) to `hardware_catalog` so admins can exclude items from the configurator without deactivating the Shopify sync record
    - Adds `is_featured` (boolean) so admins can float items to the top of their category
    - Adds `admin_category_override` (text) so admins can re-bucket items that currently land in "Other"
    - Adds `merged_into_id` (uuid) so duplicate records can be hidden and merged into a chosen winner; references `hardware_catalog(id)`
  2. Security
    - RLS remains enabled; adds authenticated write policies mirroring `fabric_catalog`
    - Public SELECT still only returns rows where `is_active = true AND admin_hidden = false`
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hardware_catalog' AND column_name = 'admin_hidden'
  ) THEN
    ALTER TABLE hardware_catalog ADD COLUMN admin_hidden boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hardware_catalog' AND column_name = 'is_featured'
  ) THEN
    ALTER TABLE hardware_catalog ADD COLUMN is_featured boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hardware_catalog' AND column_name = 'admin_category_override'
  ) THEN
    ALTER TABLE hardware_catalog ADD COLUMN admin_category_override text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hardware_catalog' AND column_name = 'merged_into_id'
  ) THEN
    ALTER TABLE hardware_catalog ADD COLUMN merged_into_id uuid REFERENCES hardware_catalog(id) ON DELETE SET NULL;
  END IF;
END $$;

DROP POLICY IF EXISTS "Anyone can read active hardware" ON hardware_catalog;

CREATE POLICY "Anyone can read visible hardware"
  ON hardware_catalog FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND admin_hidden = false);

CREATE POLICY "Authenticated users can read all hardware catalog"
  ON hardware_catalog FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update hardware catalog"
  ON hardware_catalog FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='hardware_categories' AND cmd='INSERT') THEN
    CREATE POLICY "Authenticated users can insert hardware categories"
      ON hardware_categories FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='hardware_categories' AND cmd='UPDATE') THEN
    CREATE POLICY "Authenticated users can update hardware categories"
      ON hardware_categories FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_hardware_catalog_admin_hidden ON hardware_catalog(admin_hidden);
CREATE INDEX IF NOT EXISTS idx_hardware_catalog_featured ON hardware_catalog(is_featured) WHERE is_featured = true;

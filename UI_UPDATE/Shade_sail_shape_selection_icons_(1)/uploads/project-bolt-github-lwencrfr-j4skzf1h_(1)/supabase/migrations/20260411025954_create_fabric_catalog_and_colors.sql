/*
  # Create Fabric Catalog and Colors Tables

  Moves the entire fabric and color catalog from hardcoded static data into the database,
  enabling admin management of fabrics, colors, and stock availability.

  1. New Tables
    - `fabric_catalog`
      - `id` (text, primary key) - e.g., 'monotec370'
      - `label` (text) - display name, e.g., 'Monotec 370'
      - `description` (text) - short description
      - `detailed_description` (text) - full description for tooltips
      - `benefits` (jsonb) - array of benefit strings
      - `best_for` (jsonb) - array of use-case strings
      - `uv_protection` (text) - e.g., '95%+'
      - `warranty_years` (integer)
      - `made_in` (text) - country of origin
      - `weight_per_sqm` (integer) - grams per square meter
      - `badge_text` (text) - e.g., 'Premium', 'Good Value', 'Best Value'
      - `is_fire_retardant` (boolean) - whether this fabric line has FR options
      - `display_order` (integer) - sort order
      - `is_active` (boolean) - whether visible in configurator
      - `created_at`, `updated_at` (timestamptz)

    - `fabric_colors`
      - `id` (uuid, primary key)
      - `fabric_type_id` (text, FK to fabric_catalog.id)
      - `color_name` (text) - display name
      - `image_url` (text) - Shopify CDN swatch URL
      - `text_color` (text) - '#FFFFFF' or '#000000' for contrast
      - `shade_factor` (numeric) - UV shade factor percentage
      - `is_fire_retardant` (boolean) - for ExtraBlock FR/Standard distinction
      - `is_in_stock` (boolean) - toggle to hide from customers
      - `display_order` (integer) - sort order within fabric
      - `created_at`, `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Allow anon SELECT for active records (configurator needs this)
    - Restrict INSERT/UPDATE/DELETE to authenticated admin users

  3. Seed Data
    - Seeds all 3 current fabric types and 51 colors from existing static data
*/

-- Create fabric_catalog table
CREATE TABLE IF NOT EXISTS fabric_catalog (
  id text PRIMARY KEY,
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  detailed_description text NOT NULL DEFAULT '',
  benefits jsonb NOT NULL DEFAULT '[]',
  best_for jsonb NOT NULL DEFAULT '[]',
  uv_protection text NOT NULL DEFAULT '',
  warranty_years integer NOT NULL DEFAULT 10,
  made_in text NOT NULL DEFAULT '',
  weight_per_sqm integer NOT NULL DEFAULT 0,
  badge_text text NOT NULL DEFAULT '',
  is_fire_retardant boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fabric_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active fabric catalog"
  ON fabric_catalog FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated users can insert fabric catalog"
  ON fabric_catalog FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update fabric catalog"
  ON fabric_catalog FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete fabric catalog"
  ON fabric_catalog FOR DELETE
  TO authenticated
  USING (true);

-- Create fabric_colors table
CREATE TABLE IF NOT EXISTS fabric_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fabric_type_id text NOT NULL REFERENCES fabric_catalog(id) ON DELETE CASCADE,
  color_name text NOT NULL,
  image_url text NOT NULL DEFAULT '',
  text_color text NOT NULL DEFAULT '#FFFFFF',
  shade_factor numeric DEFAULT 0,
  is_fire_retardant boolean NOT NULL DEFAULT false,
  is_in_stock boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(fabric_type_id, color_name)
);

ALTER TABLE fabric_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read in-stock fabric colors"
  ON fabric_colors FOR SELECT
  TO anon, authenticated
  USING (is_in_stock = true);

CREATE POLICY "Authenticated users can read all fabric colors"
  ON fabric_colors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert fabric colors"
  ON fabric_colors FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update fabric colors"
  ON fabric_colors FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete fabric colors"
  ON fabric_colors FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fabric_colors_fabric_type ON fabric_colors(fabric_type_id);
CREATE INDEX IF NOT EXISTS idx_fabric_colors_in_stock ON fabric_colors(is_in_stock);
CREATE INDEX IF NOT EXISTS idx_fabric_catalog_active ON fabric_catalog(is_active);
CREATE INDEX IF NOT EXISTS idx_fabric_catalog_display_order ON fabric_catalog(display_order);

-- Seed fabric_catalog with current data
INSERT INTO fabric_catalog (id, label, description, detailed_description, benefits, best_for, uv_protection, warranty_years, made_in, weight_per_sqm, badge_text, is_fire_retardant, display_order) VALUES
(
  'monotec370',
  'Monotec 370',
  'Our premium knitted HDPE fabric, offering exceptional durability & strength',
  'Monotec 370 is our flagship knitted HDPE fabric, engineered for superior performance and longevity. Its unique monofilament construction provides unparalleled strength and UV protection, making it the ultimate choice for discerning customers seeking the best in shade solutions. While a premium investment, its extended warranty and robust design ensure lasting value and peace of mind.',
  '["Superior UV protection","Excellent airflow and breathability","Lightweight yet incredibly strong","Extra wide fabric = less joins","Easy to clean and maintain","Available in vibrant, fade-resistant colors"]',
  '["Both Commercial & Residential applications","Pool areas, patios & decks","Playgrounds and recreational areas","Locations with moderate to high wind exposure"]',
  '95%+', 15, 'Australia', 370, 'Premium', false, 0
),
(
  'extrablock330',
  'ExtraBlock 330',
  'A robust, commercial-grade fabric with excellent UV and fire-rated properties',
  'ExtraBlock 330 is our versatile, commercial-grade knitted HDPE fabric, certified to Australian fire safety standards. It strikes an excellent balance between high UV protection, durability, and cost-effectiveness, making it a popular mid-range choice for a wide array of applications. Its superior color retention and tear resistance ensure a long-lasting and attractive shade solution.',
  '["Fire-rated to Australian standards (ALNET certified)","Lighter weight yet still commercial grade durability","Superior color retention","Excellent tear and puncture resistance","Suitable for high-wind environments","Low maintenance requirements"]',
  '["Residential & Commercial applications","Schools and childcare centers","Restaurants and cafes","Public spaces and parks","Areas requiring fire-rated materials"]',
  '98%+', 10, 'South Africa', 330, 'Good Value', true, 1
),
(
  'shadetec320',
  'Shadetec 320',
  'High quality knitted fabric with high strength and great aesthetics',
  'Shadetec 320 is a high-quality knitted HDPE fabric that offers reliable UV protection and good durability at a more accessible price point. It''s an excellent entry-level option for those seeking a dependable shade solution without compromising on quality. Its refined appearance and good tear resistance make it a smart choice for residential and light commercial use.',
  '["High-quality knitted construction","Excellent strength & dimensional stability","Refined, upscale appearance","Robust & tear resistant","Excellent color fastness"]',
  '["Residential applications","Light commercial installations","Budget-conscious projects"]',
  '90%+', 10, 'South Korea', 320, 'Best Value', false, 2
)
ON CONFLICT (id) DO NOTHING;

-- Seed fabric_colors: Monotec 370 (16 colors)
INSERT INTO fabric_colors (fabric_type_id, color_name, image_url, text_color, shade_factor, is_fire_retardant, display_order) VALUES
('monotec370', 'Koonunga Green', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Monotec_-_Koonunga_Green.webp?v=1755468763', '#FFFFFF', 86.1, false, 0),
('monotec370', 'Domino Black', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Monotec_-_Domino_Black.webp?v=1755468763', '#FFFFFF', 88.4, false, 1),
('monotec370', 'Sheba Navy', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Monotec_-_Sheba_Dark_Blue.webp?v=1755468763', '#FFFFFF', 86.9, false, 2),
('monotec370', 'Lime Fizz', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Monotec_-_Lime_Fizz.webp?v=1755468763', '#000000', 84.3, false, 3),
('monotec370', 'Candy Red', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Monotec_-_candy_Red.webp?v=1755468763', '#FFFFFF', 81.9, false, 4),
('monotec370', 'Marrocan Terracotta', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Monotec_-_Marrocan_Terracotta.webp?v=1755468763', '#FFFFFF', 82.6, false, 5),
('monotec370', 'Bundena Blue', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Monotec_-_Bundena_Blue.webp?v=1755468763', '#FFFFFF', 83.2, false, 6),
('monotec370', 'Graphite Grey', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Monotec_-_Graphite_Charcoal.webp?v=1755468763', '#FFFFFF', 87.0, false, 7),
('monotec370', 'Karloo Sand', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Monotec_-_Karloo_Sand.webp?v=1755468763', '#000000', 72.5, false, 8),
('monotec370', 'Sherbet Orange', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Monotec_-_Sherbet_Orange.webp?v=1755468763', '#000000', 79.4, false, 9),
('monotec370', 'Bubblegum Pink', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Monotec_-_Bubblegum_Pink.webp?v=1755468763', '#000000', 83.6, false, 10),
('monotec370', 'Mellow Haze Yellow', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Monotec_-_Mellow_Haze_Yellow.webp?v=1755468763', '#000000', 74.7, false, 11),
('monotec370', 'Jazzberry Purple', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Monotec_-_Jazzberry_Purple.webp?v=1755468763', '#FFFFFF', 84.7, false, 12),
('monotec370', 'Abaroo Red', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Monotec_-_Abaroo_Red.webp?v=1755468763', '#FFFFFF', 83.1, false, 13),
('monotec370', 'Chino Cream', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Monotec_-_Chino_Cream.webp?v=1755468763', '#000000', 70.9, false, 14),
('monotec370', 'Titanium', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Titanium_-_front.jpg?v=1756426399', '#FFFFFF', 84.5, false, 15)
ON CONFLICT (fabric_type_id, color_name) DO NOTHING;

-- Seed fabric_colors: ExtraBlock 330 (21 colors)
INSERT INTO fabric_colors (fabric_type_id, color_name, image_url, text_color, shade_factor, is_fire_retardant, display_order) VALUES
('extrablock330', 'Pearl Onyx', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Extrablock_-_Pearl_Onyx.webp?v=1755468825', '#FFFFFF', 86, true, 0),
('extrablock330', 'Chocolate', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Extrablock_-_Chocolate.webp?v=1755468825', '#FFFFFF', 93, true, 1),
('extrablock330', 'Beige', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Extrablock_-_Beige.webp?v=1755468825', '#000000', 87, false, 2),
('extrablock330', 'Charcoal', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Extrablock_-_Charcoal.webp?v=1755468825', '#FFFFFF', 92, true, 3),
('extrablock330', 'Persian Green', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Extrablock_-_Persian_Green.webp?v=1755468825', '#FFFFFF', 91, true, 4),
('extrablock330', 'Latte', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Extrablock_-_Latte.webp?v=1755468825', '#000000', 80, true, 5),
('extrablock330', 'Yellow', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Extrablock_-_Yellow.webp?v=1755468825', '#000000', 75, false, 6),
('extrablock330', 'Navy', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Extrablock_-_Navy.webp?v=1755468825', '#FFFFFF', 95, true, 7),
('extrablock330', 'Dove Blue', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Extrablock_-_Dove_Blue.webp?v=1755468825', '#FFFFFF', 90, true, 8),
('extrablock330', 'Cream', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Extrablock_-_Cream.webp?v=1755468825', '#000000', 81, false, 9),
('extrablock330', 'Lime Green', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Extrablock_-_Lime_Green.webp?v=1755468825', '#000000', 86, true, 10),
('extrablock330', 'Forest Green', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Extrablock_-_Forest_Green.webp?v=1755468825', '#FFFFFF', 93, true, 11),
('extrablock330', 'Olive Green', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Extrablock_-_Olive_Green.webp?v=1755468825', '#FFFFFF', 96, true, 12),
('extrablock330', 'Silver', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Extrablock_-_Silver.webp?v=1755468825', '#000000', 98, true, 13),
('extrablock330', 'Sunblaze', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Extrablock_-_Sunblaze.webp?v=1755468825', '#000000', 95, true, 14),
('extrablock330', 'Midnight', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Extrablock_-_Midnight.webp?v=1755468825', '#FFFFFF', 97, true, 15),
('extrablock330', 'Mint Green', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Extrablock_-_Mint_Green.webp?v=1755468825', '#000000', 93, true, 16),
('extrablock330', 'Oxide Red', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Extrablock_-_Oxide_Red.webp?v=1755468825', '#FFFFFF', 88, true, 17),
('extrablock330', 'True Blue', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Extrablock_-_True_Blue.webp?v=1755468824', '#FFFFFF', 95, true, 18),
('extrablock330', 'Purple', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Extrablock_-_Purple.webp?v=1755468824', '#FFFFFF', 88, true, 19),
('extrablock330', 'Red', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Extrablock_-_Red.webp?v=1755468824', '#FFFFFF', 88, false, 20)
ON CONFLICT (fabric_type_id, color_name) DO NOTHING;

-- Seed fabric_colors: Shadetec 320 (14 colors)
INSERT INTO fabric_colors (fabric_type_id, color_name, image_url, text_color, shade_factor, is_fire_retardant, display_order) VALUES
('shadetec320', 'Canyon Tan', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Shadetec_-_Canyon_tan.webp?v=1755468808', '#000000', 92, false, 0),
('shadetec320', 'Desert Sand', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Shadetec_-_Desert_sand.webp?v=1755468808', '#000000', 87, false, 1),
('shadetec320', 'Deep Sea Navy', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Shadetec_-_Deep_Sea_navy.webp?v=1755468808', '#FFFFFF', 96, false, 2),
('shadetec320', 'Forest Green', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Shadetec_-_Forest_green.webp?v=1755468808', '#FFFFFF', 95, false, 3),
('shadetec320', 'Coastal Cream', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Shadetec_-_Coastal_cream.webp?v=1755468808', '#000000', 77, false, 4),
('shadetec320', 'Arctic White', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Shadetec_-_Artic_white.webp?v=1755468808', '#000000', 83.2, false, 5),
('shadetec320', 'Meadow Green', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Shadetec_-_Meadow_green.webp?v=1755468808', '#FFFFFF', 91, false, 6),
('shadetec320', 'River Sand', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Shadetec_-_River_sand.webp?v=1755468808', '#000000', 90, false, 7),
('shadetec320', 'Ocean Blue', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Shadetec_-_Ocean_blue.webp?v=1755468808', '#FFFFFF', 93, false, 8),
('shadetec320', 'Sunshine Yellow', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Shadetec_-_Sunshine_yellow.webp?v=1755468807', '#000000', 80, false, 9),
('shadetec320', 'Alpine Silver', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Shadetec_-_Alpine_Silver.webp?v=1755468808', '#000000', 94, false, 10),
('shadetec320', 'Charcoal Grey', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Shadetec_-_Charcoal_Grey.webp?v=1755468807', '#FFFFFF', 95, false, 11),
('shadetec320', 'Carbon Black', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Shadetec_-_Carbon_black.webp?v=1755468807', '#FFFFFF', 97, false, 12),
('shadetec320', 'Lava Red', 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Shadetec_-_Lava_red.webp?v=1755468807', '#FFFFFF', 91, false, 13)
ON CONFLICT (fabric_type_id, color_name) DO NOTHING;

/*
  # Create Base Pricing Tables for Admin-Managed Pricing

  1. New Tables
    - `fabric_types`
      - `id` (text, PK) - fabric type key (e.g., 'monotec370')
      - `label` (text) - display name (e.g., 'Monotec 370')
      - `display_order` (integer) - sort order in UI
      - `is_active` (boolean) - whether available for pricing
    - `fabric_pricing`
      - `id` (uuid, PK)
      - `edge_type` (text) - 'webbing' or 'cabled'
      - `perimeter` (numeric) - perimeter in meters (e.g., 9.0, 9.5, ...)
      - `prices` (jsonb) - NZD prices keyed by fabric type ID
    - `corner_costs`
      - `id` (uuid, PK)
      - `edge_type` (text) - 'webbing' or 'cabled'
      - `corners` (integer) - number of corners (3-6)
      - `cost_nzd` (numeric) - cost in NZD
    - `hardware_costs`
      - `id` (uuid, PK)
      - `edge_type` (text) - 'webbing' or 'cabled'
      - `corners` (integer) - number of corners (3-6)
      - `cost_nzd` (numeric) - cost in NZD
    - `edge_features`
      - `id` (uuid, PK)
      - `edge_type` (text) - 'webbing' or 'cabled'
      - `feature_name` (text) - 'wire_thickness' or 'webbing_width'
      - `min_perimeter` (numeric) - min perimeter in meters
      - `max_perimeter` (numeric) - max perimeter in meters
      - `feature_value` (numeric) - value in mm
    - `pricing_change_log`
      - `id` (uuid, PK)
      - `table_name` (text) - which table was changed
      - `operation` (text) - type of change
      - `previous_data` (jsonb) - snapshot before change (for undo)
      - `new_data` (jsonb) - data that was applied
      - `changed_by` (text) - admin email
      - `description` (text) - human-readable description
      - `is_undone` (boolean) - whether this change was reverted

  2. Security
    - Enable RLS on all tables
    - Anon can SELECT all base pricing tables (configurator needs to read)
    - Authenticated users can INSERT/UPDATE/DELETE (admin operations)
    - pricing_change_log: anon SELECT + INSERT via Edge Functions

  3. Data
    - All existing hardcoded pricing from src/data/pricing.ts is seeded
    - 84 webbing perimeter rows + 84 cabled perimeter rows
    - Corner costs for both edge types (3-6 corners)
    - Hardware costs for both edge types (3-6 corners)
    - Edge features (wire thickness ranges, webbing width ranges)
*/

-- Table 1: fabric_types
CREATE TABLE IF NOT EXISTS fabric_types (
  id text PRIMARY KEY,
  label text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fabric_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read active fabric types"
  ON fabric_types FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "Authenticated can read all fabric types"
  ON fabric_types FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert fabric types"
  ON fabric_types FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update fabric types"
  ON fabric_types FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete fabric types"
  ON fabric_types FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Table 2: fabric_pricing
CREATE TABLE IF NOT EXISTS fabric_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edge_type text NOT NULL,
  perimeter numeric NOT NULL,
  prices jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(edge_type, perimeter),
  CONSTRAINT fabric_pricing_edge_type_check CHECK (edge_type IN ('webbing', 'cabled')),
  CONSTRAINT fabric_pricing_perimeter_positive CHECK (perimeter > 0)
);

ALTER TABLE fabric_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read fabric pricing"
  ON fabric_pricing FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated can read fabric pricing"
  ON fabric_pricing FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert fabric pricing"
  ON fabric_pricing FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update fabric pricing"
  ON fabric_pricing FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete fabric pricing"
  ON fabric_pricing FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Table 3: corner_costs
CREATE TABLE IF NOT EXISTS corner_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edge_type text NOT NULL,
  corners integer NOT NULL,
  cost_nzd numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(edge_type, corners),
  CONSTRAINT corner_costs_edge_type_check CHECK (edge_type IN ('webbing', 'cabled')),
  CONSTRAINT corner_costs_corners_range CHECK (corners BETWEEN 3 AND 8)
);

ALTER TABLE corner_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read corner costs"
  ON corner_costs FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated can read corner costs"
  ON corner_costs FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert corner costs"
  ON corner_costs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update corner costs"
  ON corner_costs FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete corner costs"
  ON corner_costs FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Table 4: hardware_costs
CREATE TABLE IF NOT EXISTS hardware_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edge_type text NOT NULL,
  corners integer NOT NULL,
  cost_nzd numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(edge_type, corners),
  CONSTRAINT hardware_costs_edge_type_check CHECK (edge_type IN ('webbing', 'cabled')),
  CONSTRAINT hardware_costs_corners_range CHECK (corners BETWEEN 3 AND 8)
);

ALTER TABLE hardware_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read hardware costs"
  ON hardware_costs FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated can read hardware costs"
  ON hardware_costs FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert hardware costs"
  ON hardware_costs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update hardware costs"
  ON hardware_costs FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete hardware costs"
  ON hardware_costs FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Table 5: edge_features
CREATE TABLE IF NOT EXISTS edge_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edge_type text NOT NULL,
  feature_name text NOT NULL,
  min_perimeter numeric NOT NULL,
  max_perimeter numeric NOT NULL,
  feature_value numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(edge_type, feature_name, min_perimeter),
  CONSTRAINT edge_features_edge_type_check CHECK (edge_type IN ('webbing', 'cabled')),
  CONSTRAINT edge_features_perimeter_order CHECK (max_perimeter >= min_perimeter)
);

ALTER TABLE edge_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read edge features"
  ON edge_features FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated can read edge features"
  ON edge_features FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert edge features"
  ON edge_features FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update edge features"
  ON edge_features FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete edge features"
  ON edge_features FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Table 6: pricing_change_log
CREATE TABLE IF NOT EXISTS pricing_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  operation text NOT NULL,
  previous_data jsonb,
  new_data jsonb,
  changed_by text NOT NULL DEFAULT 'admin',
  description text,
  is_undone boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pricing_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read pricing change log"
  ON pricing_change_log FOR SELECT TO anon
  USING (true);

CREATE POLICY "Anon can insert pricing change log"
  ON pricing_change_log FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated can read pricing change log"
  ON pricing_change_log FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert pricing change log"
  ON pricing_change_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update pricing change log"
  ON pricing_change_log FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fabric_pricing_edge_perimeter ON fabric_pricing(edge_type, perimeter);
CREATE INDEX IF NOT EXISTS idx_corner_costs_edge_corners ON corner_costs(edge_type, corners);
CREATE INDEX IF NOT EXISTS idx_hardware_costs_edge_corners ON hardware_costs(edge_type, corners);
CREATE INDEX IF NOT EXISTS idx_edge_features_edge_name ON edge_features(edge_type, feature_name);
CREATE INDEX IF NOT EXISTS idx_pricing_change_log_table ON pricing_change_log(table_name, created_at DESC);

-- Seed fabric_types
INSERT INTO fabric_types (id, label, display_order, is_active) VALUES
  ('monotec370', 'Monotec 370', 1, true),
  ('extrablock330', 'ExtraBlock 330', 2, true),
  ('shadetec320', 'Shadetec 320', 3, true)
ON CONFLICT (id) DO NOTHING;

-- Seed webbing fabric pricing
INSERT INTO fabric_pricing (edge_type, perimeter, prices) VALUES
  ('webbing', 9.0, '{"monotec370": 598.23, "extrablock330": 583.26, "shadetec320": 549.57}'),
  ('webbing', 9.5, '{"monotec370": 631.41, "extrablock330": 614.73, "shadetec320": 577.20}'),
  ('webbing', 10.0, '{"monotec370": 665.51, "extrablock330": 647.03, "shadetec320": 605.44}'),
  ('webbing', 10.5, '{"monotec370": 700.54, "extrablock330": 680.16, "shadetec320": 634.31}'),
  ('webbing', 11.0, '{"monotec370": 736.49, "extrablock330": 714.12, "shadetec320": 663.80}'),
  ('webbing', 11.5, '{"monotec370": 773.37, "extrablock330": 748.93, "shadetec320": 693.92}'),
  ('webbing', 12.0, '{"monotec370": 811.16, "extrablock330": 784.55, "shadetec320": 724.65}'),
  ('webbing', 12.5, '{"monotec370": 849.88, "extrablock330": 821.00, "shadetec320": 756.02}'),
  ('webbing', 13.0, '{"monotec370": 889.53, "extrablock330": 858.29, "shadetec320": 788.00}'),
  ('webbing', 13.5, '{"monotec370": 930.10, "extrablock330": 896.42, "shadetec320": 820.61}'),
  ('webbing', 14.0, '{"monotec370": 971.60, "extrablock330": 935.38, "shadetec320": 853.86}'),
  ('webbing', 14.5, '{"monotec370": 1014.01, "extrablock330": 975.15, "shadetec320": 887.71}'),
  ('webbing', 15.0, '{"monotec370": 1057.35, "extrablock330": 1015.77, "shadetec320": 922.19}'),
  ('webbing', 15.5, '{"monotec370": 1101.62, "extrablock330": 1057.22, "shadetec320": 957.29}'),
  ('webbing', 16.0, '{"monotec370": 1146.81, "extrablock330": 1099.50, "shadetec320": 993.02}'),
  ('webbing', 16.5, '{"monotec370": 1192.92, "extrablock330": 1142.61, "shadetec320": 1029.38}'),
  ('webbing', 17.0, '{"monotec370": 1239.96, "extrablock330": 1186.55, "shadetec320": 1066.35}'),
  ('webbing', 17.5, '{"monotec370": 1287.94, "extrablock330": 1231.34, "shadetec320": 1103.96}'),
  ('webbing', 18.0, '{"monotec370": 1336.81, "extrablock330": 1276.94, "shadetec320": 1142.18}'),
  ('webbing', 18.5, '{"monotec370": 1386.63, "extrablock330": 1323.38, "shadetec320": 1181.03}'),
  ('webbing', 19.0, '{"monotec370": 1437.36, "extrablock330": 1370.65, "shadetec320": 1220.50}'),
  ('webbing', 19.5, '{"monotec370": 1489.02, "extrablock330": 1418.75, "shadetec320": 1260.60}'),
  ('webbing', 20.0, '{"monotec370": 1541.62, "extrablock330": 1467.69, "shadetec320": 1301.33}'),
  ('webbing', 20.5, '{"monotec370": 1595.12, "extrablock330": 1517.45, "shadetec320": 1342.66}'),
  ('webbing', 21.0, '{"monotec370": 1649.55, "extrablock330": 1568.05, "shadetec320": 1384.63}'),
  ('webbing', 21.5, '{"monotec370": 1704.90, "extrablock330": 1619.48, "shadetec320": 1427.22}'),
  ('webbing', 22.0, '{"monotec370": 1761.18, "extrablock330": 1671.74, "shadetec320": 1470.43}'),
  ('webbing', 22.5, '{"monotec370": 1818.39, "extrablock330": 1724.83, "shadetec320": 1514.27}'),
  ('webbing', 23.0, '{"monotec370": 1876.52, "extrablock330": 1778.76, "shadetec320": 1558.73}'),
  ('webbing', 23.5, '{"monotec370": 1935.58, "extrablock330": 1833.52, "shadetec320": 1603.83}'),
  ('webbing', 24.0, '{"monotec370": 1995.55, "extrablock330": 1889.10, "shadetec320": 1649.53}'),
  ('webbing', 24.5, '{"monotec370": 2056.45, "extrablock330": 1945.52, "shadetec320": 1695.87}'),
  ('webbing', 25.0, '{"monotec370": 2118.28, "extrablock330": 2002.77, "shadetec320": 1742.82}'),
  ('webbing', 25.5, '{"monotec370": 2181.03, "extrablock330": 2060.86, "shadetec320": 1790.40}'),
  ('webbing', 26.0, '{"monotec370": 2244.71, "extrablock330": 2119.78, "shadetec320": 1838.62}'),
  ('webbing', 26.5, '{"monotec370": 2309.30, "extrablock330": 2179.52, "shadetec320": 1887.44}'),
  ('webbing', 27.0, '{"monotec370": 2374.82, "extrablock330": 2240.10, "shadetec320": 1936.89}'),
  ('webbing', 27.5, '{"monotec370": 2441.27, "extrablock330": 2301.51, "shadetec320": 1986.97}'),
  ('webbing', 28.0, '{"monotec370": 2508.64, "extrablock330": 2363.75, "shadetec320": 2037.67}'),
  ('webbing', 28.5, '{"monotec370": 2576.95, "extrablock330": 2426.84, "shadetec320": 2089.00}'),
  ('webbing', 29.0, '{"monotec370": 2646.15, "extrablock330": 2490.73, "shadetec320": 2140.94}'),
  ('webbing', 29.5, '{"monotec370": 2716.30, "extrablock330": 2555.47, "shadetec320": 2193.51}'),
  ('webbing', 30.0, '{"monotec370": 2827.49, "extrablock330": 2661.17, "shadetec320": 2286.84}'),
  ('webbing', 30.5, '{"monotec370": 2900.13, "extrablock330": 2728.21, "shadetec320": 2341.30}'),
  ('webbing', 31.0, '{"monotec370": 2973.69, "extrablock330": 2796.09, "shadetec320": 2396.39}'),
  ('webbing', 31.5, '{"monotec370": 3048.18, "extrablock330": 2864.81, "shadetec320": 2452.11}'),
  ('webbing', 32.0, '{"monotec370": 3123.59, "extrablock330": 2934.35, "shadetec320": 2508.45}'),
  ('webbing', 32.5, '{"monotec370": 3199.92, "extrablock330": 3004.72, "shadetec320": 2565.41}'),
  ('webbing', 33.0, '{"monotec370": 3277.18, "extrablock330": 3075.92, "shadetec320": 2622.98}'),
  ('webbing', 33.5, '{"monotec370": 3355.37, "extrablock330": 3147.97, "shadetec320": 2681.21}'),
  ('webbing', 34.0, '{"monotec370": 3434.47, "extrablock330": 3220.83, "shadetec320": 2740.03}'),
  ('webbing', 34.5, '{"monotec370": 3514.51, "extrablock330": 3294.54, "shadetec320": 2799.49}'),
  ('webbing', 35.0, '{"monotec370": 3644.84, "extrablock330": 3418.45, "shadetec320": 2908.94}'),
  ('webbing', 35.5, '{"monotec370": 3727.40, "extrablock330": 3494.50, "shadetec320": 2970.33}'),
  ('webbing', 36.0, '{"monotec370": 3810.90, "extrablock330": 3571.39, "shadetec320": 3032.35}'),
  ('webbing', 36.5, '{"monotec370": 3895.31, "extrablock330": 3649.10, "shadetec320": 3094.99}'),
  ('webbing', 37.0, '{"monotec370": 3980.65, "extrablock330": 3727.65, "shadetec320": 3158.26}'),
  ('webbing', 37.5, '{"monotec370": 4066.90, "extrablock330": 3807.02, "shadetec320": 3222.13}'),
  ('webbing', 38.0, '{"monotec370": 4154.10, "extrablock330": 3887.23, "shadetec320": 3286.65}'),
  ('webbing', 38.5, '{"monotec370": 4242.21, "extrablock330": 3968.28, "shadetec320": 3351.78}'),
  ('webbing', 39.0, '{"monotec370": 4331.24, "extrablock330": 4050.14, "shadetec320": 3417.53}'),
  ('webbing', 39.5, '{"monotec370": 4421.20, "extrablock330": 4132.86, "shadetec320": 3483.92}'),
  ('webbing', 40.0, '{"monotec370": 4512.08, "extrablock330": 4216.39, "shadetec320": 3550.92}'),
  ('webbing', 40.5, '{"monotec370": 4603.90, "extrablock330": 4300.77, "shadetec320": 3618.56}'),
  ('webbing', 41.0, '{"monotec370": 4696.63, "extrablock330": 4385.97, "shadetec320": 3686.80}'),
  ('webbing', 41.5, '{"monotec370": 4790.27, "extrablock330": 4471.99, "shadetec320": 3755.67}'),
  ('webbing', 42.0, '{"monotec370": 4884.86, "extrablock330": 4558.86, "shadetec320": 3825.17}'),
  ('webbing', 42.5, '{"monotec370": 4980.36, "extrablock330": 4646.55, "shadetec320": 3895.30}'),
  ('webbing', 43.0, '{"monotec370": 5076.79, "extrablock330": 4735.09, "shadetec320": 3966.05}'),
  ('webbing', 43.5, '{"monotec370": 5174.15, "extrablock330": 4824.44, "shadetec320": 4037.42}'),
  ('webbing', 44.0, '{"monotec370": 5272.43, "extrablock330": 4914.64, "shadetec320": 4109.42}'),
  ('webbing', 44.5, '{"monotec370": 5371.63, "extrablock330": 5005.66, "shadetec320": 4182.04}'),
  ('webbing', 45.0, '{"monotec370": 5471.75, "extrablock330": 5097.51, "shadetec320": 4255.27}'),
  ('webbing', 45.5, '{"monotec370": 5572.80, "extrablock330": 5190.20, "shadetec320": 4329.14}'),
  ('webbing', 46.0, '{"monotec370": 5674.76, "extrablock330": 5283.71, "shadetec320": 4403.63}'),
  ('webbing', 46.5, '{"monotec370": 5777.67, "extrablock330": 5378.07, "shadetec320": 4478.75}'),
  ('webbing', 47.0, '{"monotec370": 5881.49, "extrablock330": 5473.25, "shadetec320": 4554.48}'),
  ('webbing', 47.5, '{"monotec370": 5986.23, "extrablock330": 5569.26, "shadetec320": 4630.84}'),
  ('webbing', 48.0, '{"monotec370": 6091.91, "extrablock330": 5666.11, "shadetec320": 4707.83}'),
  ('webbing', 48.5, '{"monotec370": 6198.50, "extrablock330": 5763.79, "shadetec320": 4785.44}'),
  ('webbing', 49.0, '{"monotec370": 6306.02, "extrablock330": 5862.30, "shadetec320": 4863.68}'),
  ('webbing', 49.5, '{"monotec370": 6414.46, "extrablock330": 5961.63, "shadetec320": 4942.52}'),
  ('webbing', 50.0, '{"monotec370": 6523.83, "extrablock330": 6061.81, "shadetec320": 5022.01}')
ON CONFLICT (edge_type, perimeter) DO NOTHING;

-- Seed cabled fabric pricing
INSERT INTO fabric_pricing (edge_type, perimeter, prices) VALUES
  ('cabled', 9.0, '{"monotec370": 606.36, "extrablock330": 591.39, "shadetec320": 557.70}'),
  ('cabled', 9.5, '{"monotec370": 639.54, "extrablock330": 622.86, "shadetec320": 585.33}'),
  ('cabled', 10.0, '{"monotec370": 673.64, "extrablock330": 655.16, "shadetec320": 613.57}'),
  ('cabled', 10.5, '{"monotec370": 708.67, "extrablock330": 688.29, "shadetec320": 642.44}'),
  ('cabled', 11.0, '{"monotec370": 744.62, "extrablock330": 722.25, "shadetec320": 671.93}'),
  ('cabled', 11.5, '{"monotec370": 781.50, "extrablock330": 757.06, "shadetec320": 702.05}'),
  ('cabled', 12.0, '{"monotec370": 819.29, "extrablock330": 792.68, "shadetec320": 732.78}'),
  ('cabled', 12.5, '{"monotec370": 858.01, "extrablock330": 829.13, "shadetec320": 764.15}'),
  ('cabled', 13.0, '{"monotec370": 897.66, "extrablock330": 866.42, "shadetec320": 796.13}'),
  ('cabled', 13.5, '{"monotec370": 938.23, "extrablock330": 904.55, "shadetec320": 828.74}'),
  ('cabled', 14.0, '{"monotec370": 979.73, "extrablock330": 943.51, "shadetec320": 861.99}'),
  ('cabled', 14.5, '{"monotec370": 1022.14, "extrablock330": 983.28, "shadetec320": 895.84}'),
  ('cabled', 15.0, '{"monotec370": 1065.48, "extrablock330": 1023.90, "shadetec320": 930.32}'),
  ('cabled', 15.5, '{"monotec370": 1109.75, "extrablock330": 1065.35, "shadetec320": 965.42}'),
  ('cabled', 16.0, '{"monotec370": 1154.94, "extrablock330": 1107.63, "shadetec320": 1001.15}'),
  ('cabled', 16.5, '{"monotec370": 1201.05, "extrablock330": 1150.74, "shadetec320": 1037.51}'),
  ('cabled', 17.0, '{"monotec370": 1248.09, "extrablock330": 1194.68, "shadetec320": 1074.48}'),
  ('cabled', 17.5, '{"monotec370": 1296.07, "extrablock330": 1239.47, "shadetec320": 1112.09}'),
  ('cabled', 18.0, '{"monotec370": 1344.94, "extrablock330": 1285.07, "shadetec320": 1150.31}'),
  ('cabled', 18.5, '{"monotec370": 1394.76, "extrablock330": 1331.51, "shadetec320": 1189.16}'),
  ('cabled', 19.0, '{"monotec370": 1445.49, "extrablock330": 1378.78, "shadetec320": 1228.63}'),
  ('cabled', 19.5, '{"monotec370": 1497.15, "extrablock330": 1426.88, "shadetec320": 1268.73}'),
  ('cabled', 20.0, '{"monotec370": 1549.75, "extrablock330": 1475.82, "shadetec320": 1309.46}'),
  ('cabled', 20.5, '{"monotec370": 1603.25, "extrablock330": 1525.58, "shadetec320": 1350.79}'),
  ('cabled', 21.0, '{"monotec370": 1657.68, "extrablock330": 1576.18, "shadetec320": 1392.76}'),
  ('cabled', 21.5, '{"monotec370": 1713.03, "extrablock330": 1627.61, "shadetec320": 1435.35}'),
  ('cabled', 22.0, '{"monotec370": 1769.31, "extrablock330": 1679.87, "shadetec320": 1478.56}'),
  ('cabled', 22.5, '{"monotec370": 1826.52, "extrablock330": 1732.96, "shadetec320": 1522.40}'),
  ('cabled', 23.0, '{"monotec370": 1884.65, "extrablock330": 1786.89, "shadetec320": 1566.86}'),
  ('cabled', 23.5, '{"monotec370": 1943.71, "extrablock330": 1841.65, "shadetec320": 1611.96}'),
  ('cabled', 24.0, '{"monotec370": 2003.68, "extrablock330": 1897.23, "shadetec320": 1657.66}'),
  ('cabled', 24.5, '{"monotec370": 2064.58, "extrablock330": 1953.65, "shadetec320": 1704.00}'),
  ('cabled', 25.0, '{"monotec370": 2126.41, "extrablock330": 2010.90, "shadetec320": 1750.95}'),
  ('cabled', 25.5, '{"monotec370": 2189.16, "extrablock330": 2068.99, "shadetec320": 1798.53}'),
  ('cabled', 26.0, '{"monotec370": 2252.84, "extrablock330": 2127.91, "shadetec320": 1846.75}'),
  ('cabled', 26.5, '{"monotec370": 2317.43, "extrablock330": 2187.65, "shadetec320": 1895.57}'),
  ('cabled', 27.0, '{"monotec370": 2382.95, "extrablock330": 2248.23, "shadetec320": 1945.02}'),
  ('cabled', 27.5, '{"monotec370": 2449.40, "extrablock330": 2309.64, "shadetec320": 1995.10}'),
  ('cabled', 28.0, '{"monotec370": 2516.77, "extrablock330": 2371.88, "shadetec320": 2045.80}'),
  ('cabled', 28.5, '{"monotec370": 2585.08, "extrablock330": 2434.97, "shadetec320": 2097.13}'),
  ('cabled', 29.0, '{"monotec370": 2654.28, "extrablock330": 2498.86, "shadetec320": 2149.07}'),
  ('cabled', 29.5, '{"monotec370": 2724.43, "extrablock330": 2563.60, "shadetec320": 2201.64}'),
  ('cabled', 30.0, '{"monotec370": 2838.06, "extrablock330": 2671.74, "shadetec320": 2297.41}'),
  ('cabled', 30.5, '{"monotec370": 2910.70, "extrablock330": 2738.78, "shadetec320": 2351.87}'),
  ('cabled', 31.0, '{"monotec370": 2984.26, "extrablock330": 2806.66, "shadetec320": 2406.96}'),
  ('cabled', 31.5, '{"monotec370": 3058.75, "extrablock330": 2875.38, "shadetec320": 2462.68}'),
  ('cabled', 32.0, '{"monotec370": 3134.16, "extrablock330": 2944.92, "shadetec320": 2519.02}'),
  ('cabled', 32.5, '{"monotec370": 3210.49, "extrablock330": 3015.29, "shadetec320": 2575.98}'),
  ('cabled', 33.0, '{"monotec370": 3287.75, "extrablock330": 3086.49, "shadetec320": 2633.55}'),
  ('cabled', 33.5, '{"monotec370": 3365.94, "extrablock330": 3158.54, "shadetec320": 2691.78}'),
  ('cabled', 34.0, '{"monotec370": 3445.04, "extrablock330": 3231.40, "shadetec320": 2750.60}'),
  ('cabled', 34.5, '{"monotec370": 3525.08, "extrablock330": 3305.11, "shadetec320": 2810.06}'),
  ('cabled', 35.0, '{"monotec370": 3606.04, "extrablock330": 3379.65, "shadetec320": 2870.14}'),
  ('cabled', 35.5, '{"monotec370": 3687.91, "extrablock330": 3455.01, "shadetec320": 2930.84}'),
  ('cabled', 36.0, '{"monotec370": 3770.72, "extrablock330": 3531.21, "shadetec320": 2992.17}'),
  ('cabled', 36.5, '{"monotec370": 3854.45, "extrablock330": 3608.24, "shadetec320": 3054.13}'),
  ('cabled', 37.0, '{"monotec370": 3939.10, "extrablock330": 3686.10, "shadetec320": 3116.71}'),
  ('cabled', 37.5, '{"monotec370": 4024.67, "extrablock330": 3764.79, "shadetec320": 3179.90}'),
  ('cabled', 38.0, '{"monotec370": 4111.18, "extrablock330": 3844.31, "shadetec320": 3243.73}'),
  ('cabled', 38.5, '{"monotec370": 4198.61, "extrablock330": 3924.68, "shadetec320": 3308.18}'),
  ('cabled', 39.0, '{"monotec370": 4286.95, "extrablock330": 4005.85, "shadetec320": 3373.24}'),
  ('cabled', 39.5, '{"monotec370": 4376.22, "extrablock330": 4087.88, "shadetec320": 3438.94}'),
  ('cabled', 40.0, '{"monotec370": 4498.60, "extrablock330": 4202.91, "shadetec320": 3537.44}'),
  ('cabled', 40.5, '{"monotec370": 4590.11, "extrablock330": 4286.98, "shadetec320": 3604.77}'),
  ('cabled', 41.0, '{"monotec370": 4682.52, "extrablock330": 4371.86, "shadetec320": 3672.69}'),
  ('cabled', 41.5, '{"monotec370": 4775.85, "extrablock330": 4457.57, "shadetec320": 3741.25}'),
  ('cabled', 42.0, '{"monotec370": 4870.12, "extrablock330": 4544.12, "shadetec320": 3810.43}'),
  ('cabled', 42.5, '{"monotec370": 4965.30, "extrablock330": 4631.49, "shadetec320": 3880.24}'),
  ('cabled', 43.0, '{"monotec370": 5061.42, "extrablock330": 4719.72, "shadetec320": 3950.68}'),
  ('cabled', 43.5, '{"monotec370": 5158.46, "extrablock330": 4808.75, "shadetec320": 4021.73}'),
  ('cabled', 44.0, '{"monotec370": 5256.42, "extrablock330": 4898.63, "shadetec320": 4093.41}'),
  ('cabled', 44.5, '{"monotec370": 5355.30, "extrablock330": 4989.33, "shadetec320": 4165.71}'),
  ('cabled', 45.0, '{"monotec370": 5455.11, "extrablock330": 5080.87, "shadetec320": 4238.63}'),
  ('cabled', 45.5, '{"monotec370": 5555.85, "extrablock330": 5173.25, "shadetec320": 4312.19}'),
  ('cabled', 46.0, '{"monotec370": 5657.49, "extrablock330": 5266.44, "shadetec320": 4386.36}'),
  ('cabled', 46.5, '{"monotec370": 5760.08, "extrablock330": 5360.48, "shadetec320": 4461.16}'),
  ('cabled', 47.0, '{"monotec370": 5863.59, "extrablock330": 5455.35, "shadetec320": 4536.58}'),
  ('cabled', 47.5, '{"monotec370": 5968.01, "extrablock330": 5551.04, "shadetec320": 4612.62}'),
  ('cabled', 48.0, '{"monotec370": 6073.37, "extrablock330": 5647.57, "shadetec320": 4689.29}'),
  ('cabled', 48.5, '{"monotec370": 6179.64, "extrablock330": 5744.93, "shadetec320": 4766.58}'),
  ('cabled', 49.0, '{"monotec370": 6286.85, "extrablock330": 5843.13, "shadetec320": 4844.51}'),
  ('cabled', 49.5, '{"monotec370": 6394.98, "extrablock330": 5942.15, "shadetec320": 4923.04}'),
  ('cabled', 50.0, '{"monotec370": 6504.03, "extrablock330": 6042.01, "shadetec320": 5002.21}')
ON CONFLICT (edge_type, perimeter) DO NOTHING;

-- Seed corner costs
INSERT INTO corner_costs (edge_type, corners, cost_nzd) VALUES
  ('webbing', 3, 268.74), ('webbing', 4, 358.32), ('webbing', 5, 447.90), ('webbing', 6, 537.48),
  ('cabled', 3, 329.00), ('cabled', 4, 438.67), ('cabled', 5, 548.33), ('cabled', 6, 658.00)
ON CONFLICT (edge_type, corners) DO NOTHING;

-- Seed hardware costs
INSERT INTO hardware_costs (edge_type, corners, cost_nzd) VALUES
  ('webbing', 3, 222.52), ('webbing', 4, 291.04), ('webbing', 5, 359.57), ('webbing', 6, 428.09),
  ('cabled', 3, 222.52), ('cabled', 4, 291.04), ('cabled', 5, 359.57), ('cabled', 6, 428.09)
ON CONFLICT (edge_type, corners) DO NOTHING;

-- Seed edge features
INSERT INTO edge_features (edge_type, feature_name, min_perimeter, max_perimeter, feature_value) VALUES
  ('cabled', 'wire_thickness', 0, 29.5, 4),
  ('cabled', 'wire_thickness', 30, 40, 5),
  ('cabled', 'wire_thickness', 40, 50, 6),
  ('webbing', 'webbing_width', 0, 34.5, 50),
  ('webbing', 'webbing_width', 35, 50, 63)
ON CONFLICT (edge_type, feature_name, min_perimeter) DO NOTHING;

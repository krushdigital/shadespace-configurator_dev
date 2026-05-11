/*
  # Add Commercial 95 Fabric

  1. New Data
    - Inserts `commercial95` fabric type into `fabric_types`
    - Inserts `commercial95` into `fabric_catalog` with description, UV, warranty, weight, etc.
    - Updates all 103 rows of `fabric_pricing` (both edge types) to include `commercial95` in the `prices` JSONB map

  2. Pricing Source
    - Apr-26 RRP pricelist provided by Shade Systems Global:
      - Webbing Edge prices
      - Wire (Cabled) Edge prices
    - Perimeters 9 through 60 in 0.5 increments

  3. Notes
    - Existing fabric price entries in `prices` are preserved
    - No destructive operations
*/

-- 1. Fabric type
INSERT INTO fabric_types (id, label, display_order, is_active)
VALUES ('commercial95', 'Commercial 95', 4, true)
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, is_active = EXCLUDED.is_active;

-- 2. Fabric catalog
INSERT INTO fabric_catalog (
  id, label, description, detailed_description, benefits, best_for,
  uv_protection, warranty_years, made_in, weight_per_sqm, badge_text,
  is_fire_retardant, display_order, is_active,
  short_name, chip_color, tagline, highlights
)
VALUES (
  'commercial95',
  'Commercial 95',
  'Heavy-duty commercial mesh with stainless steel D-rings and twin-stitched PTFE seams',
  'Commercial95 is a premium commercial-grade shade mesh engineered for maximum longevity. Custom made with a 15-year fabric warranty, it features twin-stitched PTFE thread, stainless steel D-rings at every corner, and heavy-duty webbing inside the hem for exceptional structural integrity.',
  '["15-year fabric warranty", "Twin-stitched PTFE seams", "Stainless steel D-rings at corners", "Heavy-duty webbing inside hem", "Premium commercial-grade mesh"]'::jsonb,
  '["Commercial installations", "Schools and public spaces", "High-wind exposure sites", "Long-term shade structures"]'::jsonb,
  '95%+',
  15,
  'Australia',
  340,
  'Commercial',
  false,
  3,
  true,
  'Commercial95',
  '#01312D',
  'Commercial-grade. 15-year warranty.',
  '["15-year warranty", "PTFE twin-stitched", "Stainless D-rings"]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  detailed_description = EXCLUDED.detailed_description,
  benefits = EXCLUDED.benefits,
  best_for = EXCLUDED.best_for,
  uv_protection = EXCLUDED.uv_protection,
  warranty_years = EXCLUDED.warranty_years,
  made_in = EXCLUDED.made_in,
  weight_per_sqm = EXCLUDED.weight_per_sqm,
  badge_text = EXCLUDED.badge_text,
  display_order = EXCLUDED.display_order,
  short_name = EXCLUDED.short_name,
  chip_color = EXCLUDED.chip_color,
  tagline = EXCLUDED.tagline,
  highlights = EXCLUDED.highlights;

-- 3. Update fabric_pricing rows with Commercial95 prices
-- Cabled (Wire Edge) prices
UPDATE fabric_pricing SET prices = prices || jsonb_build_object('commercial95',
  CASE perimeter::text
    WHEN '9' THEN 639.71 WHEN '9.5' THEN 673.27 WHEN '10' THEN 707.69 WHEN '10.5' THEN 742.98
    WHEN '11' THEN 779.13 WHEN '11.5' THEN 816.14 WHEN '12' THEN 854.01 WHEN '12.5' THEN 892.75
    WHEN '13' THEN 932.35 WHEN '13.5' THEN 972.81 WHEN '14' THEN 1014.13 WHEN '14.5' THEN 1056.32
    WHEN '15' THEN 1099.37 WHEN '15.5' THEN 1143.28 WHEN '16' THEN 1188.05 WHEN '16.5' THEN 1233.69
    WHEN '17' THEN 1280.19 WHEN '17.5' THEN 1327.55 WHEN '18' THEN 1375.77 WHEN '18.5' THEN 1424.86
    WHEN '19' THEN 1474.81 WHEN '19.5' THEN 1525.62 WHEN '20' THEN 1577.29 WHEN '20.5' THEN 1629.83
    WHEN '21' THEN 1683.23 WHEN '21.5' THEN 1737.49 WHEN '22' THEN 1792.61 WHEN '22.5' THEN 1848.60
    WHEN '23' THEN 1905.45 WHEN '23.5' THEN 1963.16 WHEN '24' THEN 2021.73 WHEN '24.5' THEN 2081.17
    WHEN '25' THEN 2141.47 WHEN '25.5' THEN 2202.63 WHEN '26' THEN 2264.65 WHEN '26.5' THEN 2327.54
    WHEN '27' THEN 2391.29 WHEN '27.5' THEN 2455.90 WHEN '28' THEN 2521.37 WHEN '28.5' THEN 2587.71
    WHEN '29' THEN 2654.91 WHEN '29.5' THEN 2722.97 WHEN '30' THEN 2838.59 WHEN '30.5' THEN 2909.09
    WHEN '31' THEN 2980.45 WHEN '31.5' THEN 3052.67 WHEN '32' THEN 3125.75 WHEN '32.5' THEN 3199.70
    WHEN '33' THEN 3274.51 WHEN '33.5' THEN 3350.18 WHEN '34' THEN 3426.71 WHEN '34.5' THEN 3504.11
    WHEN '35' THEN 3582.37 WHEN '35.5' THEN 3661.49 WHEN '36' THEN 3741.47 WHEN '36.5' THEN 3822.32
    WHEN '37' THEN 3904.03 WHEN '37.5' THEN 3986.60 WHEN '38' THEN 4070.03 WHEN '38.5' THEN 4154.33
    WHEN '39' THEN 4239.49 WHEN '39.5' THEN 4325.51 WHEN '40' THEN 4447.68 WHEN '40.5' THEN 4535.83
    WHEN '41' THEN 4624.85 WHEN '41.5' THEN 4714.72 WHEN '42' THEN 4805.46 WHEN '42.5' THEN 4897.06
    WHEN '43' THEN 4989.53 WHEN '43.5' THEN 5082.85 WHEN '44' THEN 5177.04 WHEN '44.5' THEN 5272.09
    WHEN '45' THEN 5368.01 WHEN '45.5' THEN 5464.78 WHEN '46' THEN 5562.42 WHEN '46.5' THEN 5660.92
    WHEN '47' THEN 5760.29 WHEN '47.5' THEN 5860.51 WHEN '48' THEN 5961.60 WHEN '48.5' THEN 6063.55
    WHEN '49' THEN 6166.37 WHEN '49.5' THEN 6270.04 WHEN '50' THEN 6374.58 WHEN '50.5' THEN 6479.98
    WHEN '51' THEN 6586.25 WHEN '51.5' THEN 6693.37 WHEN '52' THEN 6801.36 WHEN '52.5' THEN 6910.21
    WHEN '53' THEN 7019.93 WHEN '53.5' THEN 7130.50 WHEN '54' THEN 7241.94 WHEN '54.5' THEN 7354.24
    WHEN '55' THEN 7467.41 WHEN '55.5' THEN 7581.43 WHEN '56' THEN 7696.32 WHEN '56.5' THEN 7812.07
    WHEN '57' THEN 7928.69 WHEN '57.5' THEN 8046.16 WHEN '58' THEN 8164.50 WHEN '58.5' THEN 8283.70
    WHEN '59' THEN 8403.77 WHEN '59.5' THEN 8524.69 WHEN '60' THEN 8646.48
  END)
WHERE edge_type = 'cabled';

-- Webbing Edge prices
UPDATE fabric_pricing SET prices = prices || jsonb_build_object('commercial95',
  CASE perimeter::text
    WHEN '9' THEN 616.01 WHEN '9.5' THEN 648.83 WHEN '10' THEN 682.51 WHEN '10.5' THEN 717.06
    WHEN '11' THEN 752.47 WHEN '11.5' THEN 788.74 WHEN '12' THEN 825.87 WHEN '12.5' THEN 863.87
    WHEN '13' THEN 902.73 WHEN '13.5' THEN 942.45 WHEN '14' THEN 983.03 WHEN '14.5' THEN 1024.48
    WHEN '15' THEN 1066.79 WHEN '15.5' THEN 1109.96 WHEN '16' THEN 1153.99 WHEN '16.5' THEN 1198.89
    WHEN '17' THEN 1244.65 WHEN '17.5' THEN 1291.27 WHEN '18' THEN 1338.75 WHEN '18.5' THEN 1387.10
    WHEN '19' THEN 1436.31 WHEN '19.5' THEN 1486.38 WHEN '20' THEN 1537.31 WHEN '20.5' THEN 1589.11
    WHEN '21' THEN 1641.77 WHEN '21.5' THEN 1695.29 WHEN '22' THEN 1749.67 WHEN '22.5' THEN 1804.92
    WHEN '23' THEN 1861.03 WHEN '23.5' THEN 1918.00 WHEN '24' THEN 1975.83 WHEN '24.5' THEN 2034.53
    WHEN '25' THEN 2094.09 WHEN '25.5' THEN 2154.51 WHEN '26' THEN 2215.79 WHEN '26.5' THEN 2277.94
    WHEN '27' THEN 2340.95 WHEN '27.5' THEN 2404.82 WHEN '28' THEN 2469.55 WHEN '28.5' THEN 2535.15
    WHEN '29' THEN 2601.61 WHEN '29.5' THEN 2668.93 WHEN '30' THEN 2737.11 WHEN '30.5' THEN 2806.16
    WHEN '31' THEN 2876.07 WHEN '31.5' THEN 2946.84 WHEN '32' THEN 3018.47 WHEN '32.5' THEN 3090.97
    WHEN '33' THEN 3164.33 WHEN '33.5' THEN 3238.55 WHEN '34' THEN 3313.63 WHEN '34.5' THEN 3389.58
    WHEN '35' THEN 3624.79 WHEN '35.5' THEN 3704.66 WHEN '36' THEN 3785.39 WHEN '36.5' THEN 3866.99
    WHEN '37' THEN 3949.45 WHEN '37.5' THEN 4032.77 WHEN '38' THEN 4116.95 WHEN '38.5' THEN 4202.00
    WHEN '39' THEN 4287.91 WHEN '39.5' THEN 4374.68 WHEN '40' THEN 4462.31 WHEN '40.5' THEN 4550.81
    WHEN '41' THEN 4640.17 WHEN '41.5' THEN 4730.39 WHEN '42' THEN 4821.47 WHEN '42.5' THEN 4913.42
    WHEN '43' THEN 5006.23 WHEN '43.5' THEN 5099.90 WHEN '44' THEN 5194.43 WHEN '44.5' THEN 5289.83
    WHEN '45' THEN 5386.09 WHEN '45.5' THEN 5483.21 WHEN '46' THEN 5581.19 WHEN '46.5' THEN 5680.04
    WHEN '47' THEN 5779.75 WHEN '47.5' THEN 5880.32 WHEN '48' THEN 5981.75 WHEN '48.5' THEN 6084.05
    WHEN '49' THEN 6187.21 WHEN '49.5' THEN 6291.23 WHEN '50' THEN 6396.11 WHEN '50.5' THEN 6501.86
    WHEN '51' THEN 6608.47 WHEN '51.5' THEN 6715.94 WHEN '52' THEN 6824.27 WHEN '52.5' THEN 6933.47
    WHEN '53' THEN 7043.53 WHEN '53.5' THEN 7154.45 WHEN '54' THEN 7266.23 WHEN '54.5' THEN 7378.88
    WHEN '55' THEN 7492.39 WHEN '55.5' THEN 7606.76 WHEN '56' THEN 7721.99 WHEN '56.5' THEN 7838.09
    WHEN '57' THEN 7955.05 WHEN '57.5' THEN 8072.87 WHEN '58' THEN 8191.55 WHEN '58.5' THEN 8311.10
    WHEN '59' THEN 8431.51 WHEN '59.5' THEN 8552.78 WHEN '60' THEN 8674.91
  END)
WHERE edge_type = 'webbing';

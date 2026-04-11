/*
  # Add 7 and 8 corner costs + extend edge feature ranges to 60m

  1. New Data
    - Corner costs for 7 and 8 corners (both webbing and cabled)
      - Webbing: 7 corners = $627.06, 8 corners = $716.64 (increment ~$89.58/corner)
      - Cabled: 7 corners = $767.67, 8 corners = $877.33 (increment ~$109.67/corner)
    - Hardware costs for 7 and 8 corners (both edge types)
      - Both: 7 corners = $496.61, 8 corners = $565.14 (increment ~$68.52/corner)

  2. Modified Data
    - Edge features: extend max_perimeter from 50 to 60 for highest tier ranges
      - Webbing width: 35-60m = 63mm (was 35-50m)
      - Wire thickness: 40-60m = 6mm (was 40-50m)

  3. Important Notes
    - Existing corner/hardware costs for 3-6 corners are NOT modified
    - Pricing extrapolated from consistent linear increment pattern
*/

-- Corner costs for 7 and 8 corners
INSERT INTO corner_costs (edge_type, corners, cost_nzd)
VALUES
  ('webbing', 7, 627.06),
  ('webbing', 8, 716.64),
  ('cabled', 7, 767.67),
  ('cabled', 8, 877.33)
ON CONFLICT DO NOTHING;

-- Hardware costs for 7 and 8 corners
INSERT INTO hardware_costs (edge_type, corners, cost_nzd)
VALUES
  ('webbing', 7, 496.61),
  ('webbing', 8, 565.14),
  ('cabled', 7, 496.61),
  ('cabled', 8, 565.14)
ON CONFLICT DO NOTHING;

-- Extend edge feature ranges to cover up to 60m perimeter
UPDATE edge_features SET max_perimeter = 60
WHERE edge_type = 'webbing' AND feature_name = 'webbing_width' AND max_perimeter = 50;

UPDATE edge_features SET max_perimeter = 60
WHERE edge_type = 'cabled' AND feature_name = 'wire_thickness' AND max_perimeter = 50;

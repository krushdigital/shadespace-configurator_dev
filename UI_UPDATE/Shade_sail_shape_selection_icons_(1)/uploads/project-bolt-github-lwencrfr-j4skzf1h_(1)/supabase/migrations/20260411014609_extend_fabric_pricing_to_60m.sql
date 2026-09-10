/*
  # Extend fabric pricing to 60m perimeter

  1. Changes
    - Adds fabric pricing rows for perimeters 50.5m through 60.0m (20 new rows)
    - Applies to both 'webbing' and 'cabled' edge types
    - Prices extrapolated from existing linear trend at top end of range
    - Monotec370 increment: ~109.05/step (cabled), ~109.37/step (webbing)
    - Extrablock330 increment: ~99.86/step (cabled), ~99.51/step (webbing) 
    - Shadetec320 increment: ~79.17/step (cabled), ~79.49/step (webbing)

  2. Important Notes
    - No existing data is modified
    - Only INSERT operations for new perimeter values
*/

INSERT INTO fabric_pricing (edge_type, perimeter, prices) VALUES
-- Cabled 50.5 to 60.0
('cabled', 50.5, '{"monotec370": 6613.08, "shadetec320": 5081.38, "extrablock330": 6141.87}'),
('cabled', 51.0, '{"monotec370": 6722.13, "shadetec320": 5160.55, "extrablock330": 6241.73}'),
('cabled', 51.5, '{"monotec370": 6831.18, "shadetec320": 5239.72, "extrablock330": 6341.59}'),
('cabled', 52.0, '{"monotec370": 6940.23, "shadetec320": 5318.89, "extrablock330": 6441.45}'),
('cabled', 52.5, '{"monotec370": 7049.28, "shadetec320": 5398.06, "extrablock330": 6541.31}'),
('cabled', 53.0, '{"monotec370": 7158.33, "shadetec320": 5477.23, "extrablock330": 6641.17}'),
('cabled', 53.5, '{"monotec370": 7267.38, "shadetec320": 5556.40, "extrablock330": 6741.03}'),
('cabled', 54.0, '{"monotec370": 7376.43, "shadetec320": 5635.57, "extrablock330": 6840.89}'),
('cabled', 54.5, '{"monotec370": 7485.48, "shadetec320": 5714.74, "extrablock330": 6940.75}'),
('cabled', 55.0, '{"monotec370": 7594.53, "shadetec320": 5793.91, "extrablock330": 7040.61}'),
('cabled', 55.5, '{"monotec370": 7703.58, "shadetec320": 5873.08, "extrablock330": 7140.47}'),
('cabled', 56.0, '{"monotec370": 7812.63, "shadetec320": 5952.25, "extrablock330": 7240.33}'),
('cabled', 56.5, '{"monotec370": 7921.68, "shadetec320": 6031.42, "extrablock330": 7340.19}'),
('cabled', 57.0, '{"monotec370": 8030.73, "shadetec320": 6110.59, "extrablock330": 7440.05}'),
('cabled', 57.5, '{"monotec370": 8139.78, "shadetec320": 6189.76, "extrablock330": 7539.91}'),
('cabled', 58.0, '{"monotec370": 8248.83, "shadetec320": 6268.93, "extrablock330": 7639.77}'),
('cabled', 58.5, '{"monotec370": 8357.88, "shadetec320": 6348.10, "extrablock330": 7739.63}'),
('cabled', 59.0, '{"monotec370": 8466.93, "shadetec320": 6427.27, "extrablock330": 7839.49}'),
('cabled', 59.5, '{"monotec370": 8575.98, "shadetec320": 6506.44, "extrablock330": 7939.35}'),
('cabled', 60.0, '{"monotec370": 8685.03, "shadetec320": 6585.61, "extrablock330": 8039.21}'),
-- Webbing 50.5 to 60.0
('webbing', 50.5, '{"monotec370": 6633.20, "shadetec320": 5101.50, "extrablock330": 6161.32}'),
('webbing', 51.0, '{"monotec370": 6742.57, "shadetec320": 5180.99, "extrablock330": 6260.83}'),
('webbing', 51.5, '{"monotec370": 6851.94, "shadetec320": 5260.48, "extrablock330": 6360.34}'),
('webbing', 52.0, '{"monotec370": 6961.31, "shadetec320": 5339.97, "extrablock330": 6459.85}'),
('webbing', 52.5, '{"monotec370": 7070.68, "shadetec320": 5419.46, "extrablock330": 6559.36}'),
('webbing', 53.0, '{"monotec370": 7180.05, "shadetec320": 5498.95, "extrablock330": 6658.87}'),
('webbing', 53.5, '{"monotec370": 7289.42, "shadetec320": 5578.44, "extrablock330": 6758.38}'),
('webbing', 54.0, '{"monotec370": 7398.79, "shadetec320": 5657.93, "extrablock330": 6857.89}'),
('webbing', 54.5, '{"monotec370": 7508.16, "shadetec320": 5737.42, "extrablock330": 6957.40}'),
('webbing', 55.0, '{"monotec370": 7617.53, "shadetec320": 5816.91, "extrablock330": 7056.91}'),
('webbing', 55.5, '{"monotec370": 7726.90, "shadetec320": 5896.40, "extrablock330": 7156.42}'),
('webbing', 56.0, '{"monotec370": 7836.27, "shadetec320": 5975.89, "extrablock330": 7255.93}'),
('webbing', 56.5, '{"monotec370": 7945.64, "shadetec320": 6055.38, "extrablock330": 7355.44}'),
('webbing', 57.0, '{"monotec370": 8055.01, "shadetec320": 6134.87, "extrablock330": 7454.95}'),
('webbing', 57.5, '{"monotec370": 8164.38, "shadetec320": 6214.36, "extrablock330": 7554.46}'),
('webbing', 58.0, '{"monotec370": 8273.75, "shadetec320": 6293.85, "extrablock330": 7653.97}'),
('webbing', 58.5, '{"monotec370": 8383.12, "shadetec320": 6373.34, "extrablock330": 7753.48}'),
('webbing', 59.0, '{"monotec370": 8492.49, "shadetec320": 6452.83, "extrablock330": 7852.99}'),
('webbing', 59.5, '{"monotec370": 8601.86, "shadetec320": 6532.32, "extrablock330": 7952.50}'),
('webbing', 60.0, '{"monotec370": 8711.23, "shadetec320": 6611.81, "extrablock330": 8052.01}')
ON CONFLICT DO NOTHING;

/*
  # Seed starter hardware catalog

  Inserts the hardware items shown in the product inspiration so the per-corner
  selection UI has real data before the Shopify sync runs. Prices in NZD are
  approximate — admin can edit them or overwrite via sync. All items marked
  inactive by default are left out so the UI shows something immediately.
*/

INSERT INTO hardware_catalog (name, short_description, material, price_nzd, category_id, display_order, is_active)
VALUES
  ('Chain - 6mm x 130mm', '316 Marine Grade Stainless Steel', '316 Marine Grade Stainless Steel', 15.00, 'chain', 10, true),
  ('Chain - 8mm x 160mm', '316 Marine Grade Stainless Steel', '316 Marine Grade Stainless Steel', 26.00, 'chain', 20, true),
  ('25MM Rhino Heavy Duty Ratchet Tensioner (Kit)', '316 Marine Grade Stainless Steel', '316 Marine Grade Stainless Steel', 55.00, 'ratchet_kit', 10, true),
  ('38MM Rhino Heavy Duty Ratchet Tensioner (Kit)', '316 Marine Grade Stainless Steel', '316 Marine Grade Stainless Steel', 62.00, 'ratchet_kit', 20, true),
  ('Bow Shackle - 8mm', '316 Marine Grade Stainless Steel', '316 Marine Grade Stainless Steel', 6.60, 'bow_shackle', 10, true),
  ('Bow Shackle - 10mm', '316 Marine Grade Stainless Steel', '316 Marine Grade Stainless Steel', 12.40, 'bow_shackle', 20, true),
  ('Bow Shackle - 12mm', '316 Marine Grade Stainless Steel', '316 Marine Grade Stainless Steel', 20.80, 'bow_shackle', 30, true),
  ('D-Shackle (Captive Pin) - 8mm', '316 Marine Grade Stainless Steel', '316 Marine Grade Stainless Steel', 5.95, 'captive_d_shackle', 10, true),
  ('D-Shackle (Captive Pin) - 10mm', '316 Marine Grade Stainless Steel', '316 Marine Grade Stainless Steel', 10.10, 'captive_d_shackle', 20, true),
  ('D-Shackle (Captive Pin) - 12mm', '316 Marine Grade Stainless Steel', '316 Marine Grade Stainless Steel', 16.20, 'captive_d_shackle', 30, true),
  ('D Shackle - 8mm', '316 Marine Grade Stainless Steel', '316 Marine Grade Stainless Steel', 5.70, 'd_shackle', 10, true),
  ('D Shackle - 10mm', '316 Marine Grade Stainless Steel', '316 Marine Grade Stainless Steel', 9.90, 'd_shackle', 20, true),
  ('D Shackle - 12mm', '316 Marine Grade Stainless Steel', '316 Marine Grade Stainless Steel', 15.40, 'd_shackle', 30, true),
  ('Turnbuckle Hook-Eye (Frame Type) - 8mm', '316 Marine Grade Stainless Steel', '316 Marine Grade Stainless Steel', 14.60, 'turnbuckle_hook_eye', 10, true),
  ('Turnbuckle Jaw-Jaw (Frame Type) - 8mm', '316 Marine Grade Stainless Steel', '316 Marine Grade Stainless Steel', 23.20, 'turnbuckle_jaw_jaw', 10, true)
ON CONFLICT DO NOTHING;

/*
  # Seed default hardware packs from existing hardware_costs

  Creates one default pack per (edge_type, corners) pair, copying the current
  flat price from `hardware_costs.cost_nzd` into `price_nzd_override`. This
  preserves today's totals exactly when a customer picks the "Standard Pack"
  path in the new configurator step.

  Items is left empty for now; admin can later attach specific catalog entries
  so the PDF/cart can itemize the pack contents. When items are added, the
  configurator still honors `price_nzd_override` for the total so nothing
  changes unexpectedly.
*/

INSERT INTO hardware_packs (name, edge_type, corners, items, price_nzd_override, is_default, is_active)
SELECT
  'Standard Hardware Pack',
  edge_type,
  corners,
  '[]'::jsonb,
  cost_nzd,
  true,
  true
FROM hardware_costs
ON CONFLICT DO NOTHING;

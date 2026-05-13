/*
  # PDF Studio — Phase B: Block-based templates

  1. Changes
    - Adds `blocks` jsonb column to `pdf_templates`.
    - Each row in `blocks` is an ordered block: { id, type, visible, props }.
    - When `blocks` is null or empty, the renderer falls back to the legacy
      `sections` visibility toggles and the default fixed order, so existing
      active templates continue to render unchanged until an admin opts in.

  2. Seed
    - Backfills existing rows with a default ordered block list that reproduces
      the current PDF layout using the new block types.

  3. Notes
    - Block `props` is intentionally free-form jsonb — each block type's renderer
      treats unknown fields as no-ops.
    - Dynamic block types (summary, measurements, anchorPoints, hardwareBreakdown,
      priceBreakdown, guarantee, pricingCallout) render using live config + calculations.
    - Custom block types (customText, customImage, customHtml, divider, spacer)
      render directly from props.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pdf_templates' AND column_name = 'blocks'
  ) THEN
    ALTER TABLE pdf_templates ADD COLUMN blocks jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;

UPDATE pdf_templates
SET blocks = jsonb_build_array(
  jsonb_build_object('id', gen_random_uuid()::text, 'type', 'summary',           'visible', true, 'props', jsonb_build_object('title', 'Shade Sail Summary')),
  jsonb_build_object('id', gen_random_uuid()::text, 'type', 'measurements',      'visible', true, 'props', jsonb_build_object('title', 'Precise Measurements')),
  jsonb_build_object('id', gen_random_uuid()::text, 'type', 'anchorPoints',      'visible', true, 'props', jsonb_build_object('title', 'Anchor Point Configuration')),
  jsonb_build_object('id', gen_random_uuid()::text, 'type', 'hardwareBreakdown', 'visible', true, 'props', jsonb_build_object('title', 'Corner Hardware Breakdown')),
  jsonb_build_object('id', gen_random_uuid()::text, 'type', 'priceBreakdown',    'visible', true, 'props', jsonb_build_object('title', 'Price Breakdown')),
  jsonb_build_object('id', gen_random_uuid()::text, 'type', 'guarantee',         'visible', true, 'props', jsonb_build_object('title', 'Premium Quality Guarantee')),
  jsonb_build_object('id', gen_random_uuid()::text, 'type', 'pricingCallout',    'visible', true, 'props', jsonb_build_object('title', 'All-Inclusive Price to Your Door'))
)
WHERE blocks IS NULL OR blocks = '[]'::jsonb;

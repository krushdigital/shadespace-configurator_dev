/*
  # Add template_type to PDF Templates for Order Fulfilment

  1. Modified Tables
    - `pdf_templates`
      - Add `template_type` column (text, NOT NULL, default 'quote')
      - Valid values: 'quote' (customer-facing), 'fulfilment' (staff-only order PDF)
      - Drop old unique constraint on name, replace with (name, template_type) unique
      - Drop old is_active index, replace with partial unique index per type

  2. New Data
    - Seed a default fulfilment template with staff-focused blocks:
      orderDetails, diagramImage, summary, measurements, anchorPoints,
      hardwareBreakdown, stepSelections

  3. Purpose
    - Allows the PDF Studio to manage two independent template categories
    - Each category has its own "active" template
    - The serve-order-pdf endpoint loads the active fulfilment template
    - The client-side PDF generator continues loading the active quote template
*/

-- Add template_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pdf_templates' AND column_name = 'template_type'
  ) THEN
    ALTER TABLE pdf_templates ADD COLUMN template_type text NOT NULL DEFAULT 'quote';
  END IF;
END $$;

-- Drop old unique constraint on name (allows same name across different types)
ALTER TABLE pdf_templates DROP CONSTRAINT IF EXISTS pdf_templates_name_key;

-- Add composite unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pdf_templates_name_type_key'
  ) THEN
    ALTER TABLE pdf_templates ADD CONSTRAINT pdf_templates_name_type_key UNIQUE (name, template_type);
  END IF;
END $$;

-- Drop old is_active index
DROP INDEX IF EXISTS pdf_templates_is_active_idx;

-- Create partial index for active quote template
CREATE INDEX IF NOT EXISTS pdf_templates_active_quote_idx
  ON pdf_templates (is_active) WHERE is_active = true AND template_type = 'quote';

-- Create partial index for active fulfilment template
CREATE INDEX IF NOT EXISTS pdf_templates_active_fulfilment_idx
  ON pdf_templates (is_active) WHERE is_active = true AND template_type = 'fulfilment';

-- Seed default fulfilment template
INSERT INTO pdf_templates (name, is_active, template_type, config, blocks)
SELECT
  'Order Fulfilment',
  true,
  'fulfilment',
  jsonb_build_object(
    'brand', jsonb_build_object(
      'primaryColor', '#1E293B',
      'accentColor', '#BFF102',
      'accentDark', '#307C31',
      'textColor', '#1E293B',
      'mutedColor', '#64748B',
      'backgroundColor', '#FFFFFF',
      'logoUrl', '',
      'fontFamily', 'Helvetica, Arial, sans-serif'
    ),
    'header', jsonb_build_object(
      'title', 'FULFILLMENT ORDER',
      'tagline', 'Internal Staff Document'
    ),
    'footer', jsonb_build_object(
      'line1', 'ShadeSpace Fulfilment - Internal Use Only',
      'line2', 'Do not share with customers'
    ),
    'sections', jsonb_build_object(
      'showSummary', true,
      'showMeasurements', true,
      'showAnchorPoints', true,
      'showHardwareBreakdown', true,
      'showPriceBreakdown', false,
      'showGuarantee', false,
      'showPricingCallout', false
    ),
    'paper', 'A4',
    'layout', jsonb_build_object('density', 'compact', 'columns', 1)
  ),
  jsonb_build_array(
    jsonb_build_object('id', gen_random_uuid()::text, 'type', 'orderDetails',       'visible', true, 'props', jsonb_build_object('title', 'Order Details')),
    jsonb_build_object('id', gen_random_uuid()::text, 'type', 'diagramImage',       'visible', true, 'props', jsonb_build_object('title', 'Shade Sail Diagram', 'maxWidth', 520)),
    jsonb_build_object('id', gen_random_uuid()::text, 'type', 'summary',            'visible', true, 'props', jsonb_build_object('title', 'Configuration Summary')),
    jsonb_build_object('id', gen_random_uuid()::text, 'type', 'measurements',       'visible', true, 'props', jsonb_build_object('title', 'Measurements')),
    jsonb_build_object('id', gen_random_uuid()::text, 'type', 'anchorPoints',       'visible', true, 'props', jsonb_build_object('title', 'Anchor Points')),
    jsonb_build_object('id', gen_random_uuid()::text, 'type', 'hardwareBreakdown',  'visible', true, 'props', jsonb_build_object('title', 'Hardware Breakdown')),
    jsonb_build_object('id', gen_random_uuid()::text, 'type', 'stepSelections',     'visible', true, 'props', jsonb_build_object('title', 'Step-by-Step Selections'))
  )
WHERE NOT EXISTS (SELECT 1 FROM pdf_templates WHERE template_type = 'fulfilment');

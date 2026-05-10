/*
  # Add fabric comparison fields to fabric_catalog

  1. Changes
    - Adds columns to fabric_catalog used by the fabric comparison widget:
      short_name, tag, chip_color, tagline,
      image_lifestyle_url, image_swatch_url, image_macro_url,
      highlights (text array), spec_extras (jsonb with numeric/higher-better hints)
    - Seeds sensible defaults for the three existing fabrics (Monotec 370,
      ExtraBlock 330, Shadetec 320), using the lifestyle/swatch/macro URLs
      already approved on shadespace.com

  2. Security
    - No RLS changes. Existing SELECT policy on fabric_catalog (public read
      for active rows) is unchanged.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fabric_catalog' AND column_name='short_name') THEN
    ALTER TABLE fabric_catalog ADD COLUMN short_name text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fabric_catalog' AND column_name='tag') THEN
    ALTER TABLE fabric_catalog ADD COLUMN tag text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fabric_catalog' AND column_name='chip_color') THEN
    ALTER TABLE fabric_catalog ADD COLUMN chip_color text DEFAULT '#307C31';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fabric_catalog' AND column_name='tagline') THEN
    ALTER TABLE fabric_catalog ADD COLUMN tagline text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fabric_catalog' AND column_name='image_lifestyle_url') THEN
    ALTER TABLE fabric_catalog ADD COLUMN image_lifestyle_url text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fabric_catalog' AND column_name='image_swatch_url') THEN
    ALTER TABLE fabric_catalog ADD COLUMN image_swatch_url text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fabric_catalog' AND column_name='image_macro_url') THEN
    ALTER TABLE fabric_catalog ADD COLUMN image_macro_url text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fabric_catalog' AND column_name='highlights') THEN
    ALTER TABLE fabric_catalog ADD COLUMN highlights jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fabric_catalog' AND column_name='spec_extras') THEN
    ALTER TABLE fabric_catalog ADD COLUMN spec_extras jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

UPDATE fabric_catalog SET
  short_name = COALESCE(NULLIF(short_name, ''), 'Monotec'),
  tag = COALESCE(NULLIF(tag, ''), '370'),
  chip_color = COALESCE(NULLIF(chip_color, ''), '#cad94a'),
  tagline = COALESCE(NULLIF(tagline, ''), 'Heavy-duty. Built to last.'),
  image_lifestyle_url = COALESCE(NULLIF(image_lifestyle_url, ''), 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Lime_Fizz_3a10301d-8bc2-4063-8681-356b765fb984.png?v=1774824593'),
  image_swatch_url = COALESCE(NULLIF(image_swatch_url, ''), 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Monotec_-_Lime_Fizz.webp?v=1755468763'),
  image_macro_url = COALESCE(NULLIF(image_macro_url, ''), 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Monotec370-Macro.png?v=1777582040'),
  highlights = CASE WHEN highlights = '[]'::jsonb THEN '["100% monofilament HDPE - the strongest construction","Positive memory yarns - no re-tensioning needed","Low maintenance - washes off easily","15-year warranty - the longest we offer"]'::jsonb ELSE highlights END,
  spec_extras = CASE WHEN spec_extras = '[]'::jsonb THEN '[{"label":"Weight","value":"370 GSM","numeric":370,"higherBetter":true,"featured":false},{"label":"UV Block","value":"Up to 98%","numeric":98,"higherBetter":true,"featured":false},{"label":"Shade Factor","value":"Up to 95%","numeric":95,"higherBetter":true,"featured":false},{"label":"Tensile","value":"High","numeric":3,"higherBetter":true,"featured":false},{"label":"Warranty","value":"15 years","numeric":15,"higherBetter":true,"featured":true}]'::jsonb ELSE spec_extras END
WHERE id = 'monotec370';

UPDATE fabric_catalog SET
  short_name = COALESCE(NULLIF(short_name, ''), 'ExtraBlock'),
  tag = COALESCE(NULLIF(tag, ''), '330'),
  chip_color = COALESCE(NULLIF(chip_color, ''), '#86c34d'),
  tagline = COALESCE(NULLIF(tagline, ''), 'More UV. FR rated.'),
  image_lifestyle_url = COALESCE(NULLIF(image_lifestyle_url, ''), 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Lime_Green_FR_5fb757f4-e7f1-4e74-b9b0-e35f7f608351.png?v=1774824593'),
  image_swatch_url = COALESCE(NULLIF(image_swatch_url, ''), 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Extrablock_-_Lime_Green.webp?v=1755468825'),
  image_macro_url = COALESCE(NULLIF(image_macro_url, ''), 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Extrablock330-Macro.png?v=1777582205'),
  highlights = CASE WHEN highlights = '[]'::jsonb THEN '["Superior UV protection - blocks up to 95%","Flame retardant rating","Dimensionally stable","Excellent colour retention"]'::jsonb ELSE highlights END,
  spec_extras = CASE WHEN spec_extras = '[]'::jsonb THEN '[{"label":"Weight","value":"330 GSM","numeric":330,"higherBetter":true,"featured":false},{"label":"UV Block","value":"Up to 95%","numeric":95,"higherBetter":true,"featured":false},{"label":"Shade Factor","value":"Up to 90%","numeric":90,"higherBetter":true,"featured":false},{"label":"Tensile","value":"Strong","numeric":2,"higherBetter":true,"featured":false},{"label":"Warranty","value":"10 years","numeric":10,"higherBetter":true,"featured":true}]'::jsonb ELSE spec_extras END
WHERE id = 'extrablock330';

UPDATE fabric_catalog SET
  short_name = COALESCE(NULLIF(short_name, ''), 'Shadetec'),
  tag = COALESCE(NULLIF(tag, ''), '320'),
  chip_color = COALESCE(NULLIF(chip_color, ''), '#2f6b3a'),
  tagline = COALESCE(NULLIF(tagline, ''), 'Soft. Versatile. Affordable.'),
  image_lifestyle_url = COALESCE(NULLIF(image_lifestyle_url, ''), 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Meadow_Green.png?v=1774824593'),
  image_swatch_url = COALESCE(NULLIF(image_swatch_url, ''), 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Shadetec_-_Meadow_green.webp?v=1755468808'),
  image_macro_url = COALESCE(NULLIF(image_macro_url, ''), 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Shadetec-Macro.png?v=1777582041'),
  highlights = CASE WHEN highlights = '[]'::jsonb THEN '["Soft, smooth finish thats easy to work with","Wide colour range","Excellent value for money","Knitted HDPE construction"]'::jsonb ELSE highlights END,
  spec_extras = CASE WHEN spec_extras = '[]'::jsonb THEN '[{"label":"Weight","value":"320 GSM","numeric":320,"higherBetter":true,"featured":false},{"label":"UV Block","value":"Up to 93%","numeric":93,"higherBetter":true,"featured":false},{"label":"Shade Factor","value":"Up to 85%","numeric":85,"higherBetter":true,"featured":false},{"label":"Tensile","value":"Standard","numeric":1,"higherBetter":true,"featured":false},{"label":"Warranty","value":"10 years","numeric":10,"higherBetter":true,"featured":true}]'::jsonb ELSE spec_extras END
WHERE id = 'shadetec320';

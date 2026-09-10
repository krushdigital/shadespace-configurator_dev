/*
  # PDF/email binding and layout density

  1. Modified Tables
    - `email_templates`
      - Add `pdf_template_id` (uuid, nullable, FK to pdf_templates) so each transactional
        email can declare which PDF design to attach. The existing `attach_pdf` boolean
        remains the master on/off switch.
      - Add `pdf_filename_pattern` (text, nullable) for an optional filename template
        (e.g. `ShadeSpace-Quote-{quote_reference}.pdf`).

    - `pdf_templates`
      - The existing `config` jsonb gains a new optional `layout` object describing
        density and columns. We do not alter the column itself (it is jsonb), but this
        migration documents the shape so the application can rely on it.

  2. Notes
    - Backfill: link `pdf_quote_delivery` email template to the active pdf_template
      so today's behaviour is preserved.
    - All changes are additive; no columns are dropped.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_templates' AND column_name = 'pdf_template_id'
  ) THEN
    ALTER TABLE email_templates ADD COLUMN pdf_template_id uuid REFERENCES pdf_templates(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_templates' AND column_name = 'pdf_filename_pattern'
  ) THEN
    ALTER TABLE email_templates ADD COLUMN pdf_filename_pattern text;
  END IF;
END $$;

UPDATE email_templates
SET pdf_template_id = (SELECT id FROM pdf_templates WHERE is_active = true ORDER BY updated_at DESC LIMIT 1)
WHERE template_key = 'pdf_quote_delivery'
  AND pdf_template_id IS NULL;

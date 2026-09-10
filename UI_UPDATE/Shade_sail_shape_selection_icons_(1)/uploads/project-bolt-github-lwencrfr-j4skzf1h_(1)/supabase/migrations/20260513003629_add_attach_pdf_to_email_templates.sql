/*
  # Add attach_pdf column to email_templates

  1. Schema change
    - `email_templates.attach_pdf` (boolean, default false)
      Tells the send-email pipeline whether to auto-generate and attach a PDF quote when a quoteId is supplied.

  2. Seed
    - Set `attach_pdf = true` for the `pdf_quote_delivery` transactional template so admin tests and queued sends both attach the PDF.

  3. Security
    - No RLS changes; existing email_templates policies remain in force.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_templates' AND column_name = 'attach_pdf'
  ) THEN
    ALTER TABLE email_templates ADD COLUMN attach_pdf boolean NOT NULL DEFAULT false;
  END IF;
END $$;

UPDATE email_templates
SET attach_pdf = true
WHERE template_key = 'pdf_quote_delivery';

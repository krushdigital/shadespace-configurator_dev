/*
  # Disable legacy server-rendered PDF auto-attach on email templates

  1. Changes
    - Sets `attach_pdf = false` and `pdf_template_id = NULL` on `pdf_quote_delivery`
      and `pdf_downloaded_followup` templates.
    - The customer-facing PDF is now generated client-side and sent as an explicit
      attachment via `send-config-email`. The legacy server-rendered Puppeteer PDF
      should never be attached.

  2. Security
    - No schema or RLS changes; only updates two existing rows.
*/

UPDATE email_templates
SET attach_pdf = false,
    pdf_template_id = NULL
WHERE template_key IN ('pdf_quote_delivery', 'pdf_downloaded_followup');

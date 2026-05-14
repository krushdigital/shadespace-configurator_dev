/*
  # Hide empty Valid Until / Price panels in customer email

  1. Changes
    - Wraps the "Valid until" line in `{{#if pricing_locked_until}}` so it only renders
      when a date is available.
    - Wraps the all-inclusive price number in `{{#if price_formatted}}` so the green panel
      only renders the headline figure when a price is available.

  2. Security
    - No schema or RLS changes; updates html_body of an existing row.
*/

UPDATE email_templates
SET html_body = REPLACE(
  html_body,
  '<div style="height:1px;background-color:#e5e7eb;margin:0 24px 12px 24px;"></div>
<div style="color:#64748B;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;margin-bottom:4px;">Valid until</div>
<div style="color:#0f172a;font-size:14px;font-weight:700;">{{pricing_locked_until}}</div>',
  '{{#if pricing_locked_until}}<div style="height:1px;background-color:#e5e7eb;margin:0 24px 12px 24px;"></div>
<div style="color:#64748B;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;margin-bottom:4px;">Valid until</div>
<div style="color:#0f172a;font-size:14px;font-weight:700;">{{pricing_locked_until}}</div>{{/if}}'
)
WHERE template_key = 'pdf_quote_delivery';

UPDATE email_templates
SET html_body = REPLACE(
  html_body,
  '<p style="color:#01312D;margin:0 0 10px 0;font-size:40px;font-weight:800;line-height:1;">{{price_formatted}}</p>',
  '{{#if price_formatted}}<p style="color:#01312D;margin:0 0 10px 0;font-size:40px;font-weight:800;line-height:1;">{{price_formatted}}</p>{{/if}}'
)
WHERE template_key = 'pdf_quote_delivery';

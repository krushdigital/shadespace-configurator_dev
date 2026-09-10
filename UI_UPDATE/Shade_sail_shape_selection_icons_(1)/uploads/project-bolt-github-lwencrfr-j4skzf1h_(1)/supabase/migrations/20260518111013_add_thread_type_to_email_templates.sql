/*
  # Add SolarFix PTFE thread info to email templates

  1. Modified Tables
    - `email_templates`: Updates the `pdf_quote_delivery` template to include a Thread row
      in the configuration summary table

  2. Changes
    - Adds a "Thread" row displaying "Sewn with SolarFix® PTFE thread" after the
      wire/webbing row in the PDF quote delivery email template configuration summary
*/

UPDATE email_templates
SET html_body = REPLACE(
  html_body,
  '{{#if wire_or_webbing}}<tr><td style="color:#475569;padding:12px 16px;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">{{wire_or_webbing_label}}</td><td style="color:#0f172a;padding:12px 16px;font-size:14px;border-bottom:1px solid #e5e7eb;">{{wire_or_webbing}}</td></tr>{{/if}}
<tr style="background-color:#f8fafc;"><td style="color:#475569;padding:12px 16px;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Corners</td>',
  '{{#if wire_or_webbing}}<tr><td style="color:#475569;padding:12px 16px;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">{{wire_or_webbing_label}}</td><td style="color:#0f172a;padding:12px 16px;font-size:14px;border-bottom:1px solid #e5e7eb;">{{wire_or_webbing}}</td></tr>{{/if}}
<tr><td style="color:#475569;padding:12px 16px;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Thread</td><td style="color:#0f172a;padding:12px 16px;font-size:14px;border-bottom:1px solid #e5e7eb;">{{thread_type}}</td></tr>
<tr style="background-color:#f8fafc;"><td style="color:#475569;padding:12px 16px;font-size:13px;font-weight:600;border-bottom:1px solid #e5e7eb;">Corners</td>'
)
WHERE template_key = 'pdf_quote_delivery'
  AND html_body LIKE '%wire_or_webbing_label%'
  AND html_body NOT LIKE '%thread_type%';
